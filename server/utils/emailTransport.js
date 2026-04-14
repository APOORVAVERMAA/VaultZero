const logger = require("./logger");
const nodemailer = require("nodemailer");
const dns = require("dns");
const dnsPromises = require("dns").promises;

const forceIpv4 = process.env.SMTP_FORCE_IPV4 !== "false";

if (forceIpv4) {
  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch (err) {
    logger.warn({ err }, "Unable to set DNS default result order to ipv4first");
  }
}

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === "true";
const smtpRequireTLS = process.env.SMTP_REQUIRE_TLS !== "false";
const smtpHostIp = process.env.SMTP_HOST_IP;
const allowAltPorts = process.env.SMTP_DISABLE_ALT_PORTS !== "true";

let verifyPromise = null;
let verified = false;
let lastWorkingEndpoint = null;
let candidateCache = [];
let candidateCacheAt = 0;

const resolveIpv4 = (hostname, _opts, cb) => {
  dns.lookup(hostname, { family: 4, all: false }, cb);
};

const createTransport = (endpoint) => nodemailer.createTransport({
  host: endpoint.host,
  port: endpoint.port,
  secure: endpoint.secure,
  requireTLS: endpoint.requireTLS,
  dnsTimeout: 10000,
  // Force IPv4 to avoid Render IPv6 ENETUNREACH when reaching Gmail SMTP.
  ...(forceIpv4 ? { lookup: resolveIpv4 } : {}),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
    servername: endpoint.servername || smtpHost,
  },
  pool: true,
  maxConnections: 3,
  maxMessages: 100,
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 30000,
});

const endpointKey = (endpoint) => `${endpoint.host}:${endpoint.port}:${endpoint.secure ? "tls" : "starttls"}`;

const buildEndpointCandidates = async () => {
  const now = Date.now();
  if (candidateCache.length && now - candidateCacheAt < 10 * 60 * 1000) {
    return [...candidateCache];
  }

  const hosts = [];
  if (smtpHostIp) hosts.push(smtpHostIp);

  try {
    if (forceIpv4) {
      const ipv4Records = await dnsPromises.resolve4(smtpHost);
      hosts.push(...ipv4Records);
    }
  } catch (err) {
    logger.warn({ err, smtpHost }, "Failed resolving SMTP host IPv4 records");
  }

  // Hostname fallback keeps compatibility with environments where DNS is healthy.
  hosts.push(smtpHost);

  const uniqueHosts = [...new Set(hosts.filter(Boolean))];
  const endpoints = [];

  for (const host of uniqueHosts) {
    endpoints.push({
      host,
      port: smtpPort,
      secure: smtpSecure,
      requireTLS: smtpRequireTLS,
      servername: smtpHost,
    });

    if (allowAltPorts) {
      // Fallback endpoint: implicit TLS mode on 465 for environments where 587 is blocked.
      endpoints.push({
        host,
        port: 465,
        secure: true,
        requireTLS: false,
        servername: smtpHost,
      });
      // Fallback endpoint: explicit STARTTLS mode on 587 for environments where 465 is blocked.
      endpoints.push({
        host,
        port: 587,
        secure: false,
        requireTLS: true,
        servername: smtpHost,
      });
    }
  }

  // de-duplicate while preserving order
  const deduped = [];
  const seen = new Set();
  for (const endpoint of endpoints) {
    const key = endpointKey(endpoint);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(endpoint);
  }

  candidateCache = deduped;
  candidateCacheAt = now;
  return [...deduped];
};

const prioritizedEndpoints = async () => {
  const endpoints = await buildEndpointCandidates();
  if (!lastWorkingEndpoint) return endpoints;

  const preferredKey = endpointKey(lastWorkingEndpoint);
  const preferred = endpoints.find((e) => endpointKey(e) === preferredKey);
  if (!preferred) return endpoints;
  return [preferred, ...endpoints.filter((e) => endpointKey(e) !== preferredKey)];
};

const verifyEmailTransport = async () => {
  if (process.env.NODE_ENV === "test" || verified) {
    return;
  }

  if (verifyPromise) {
    await verifyPromise;
    return;
  }

  verifyPromise = (async () => {
    try {
      const endpoints = await prioritizedEndpoints();
      let verifiedEndpoint = null;

      for (const endpoint of endpoints) {
        try {
          const transport = createTransport(endpoint);
          await transport.verify();
          verifiedEndpoint = endpoint;
          break;
        } catch (verifyErr) {
          logger.warn(
            {
              endpoint: {
                host: endpoint.host,
                port: endpoint.port,
                secure: endpoint.secure,
              },
              err: verifyErr,
            },
            "SMTP verify failed for endpoint candidate"
          );
        }
      }

      if (!verifiedEndpoint) {
        throw new Error("All SMTP endpoint candidates failed verification");
      }

      lastWorkingEndpoint = verifiedEndpoint;
      verified = true;
      logger.info(
        {
          provider: "gmail-smtp-app-password",
          host: verifiedEndpoint.host,
          port: verifiedEndpoint.port,
          secure: verifiedEndpoint.secure,
          requireTLS: verifiedEndpoint.requireTLS,
          forceIpv4,
          allowAltPorts,
          emailUser: process.env.EMAIL_USER,
          sender: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        },
        "Email transport verified"
      );
    } catch (error) {
      logger.error(error, "Email transport verification failed");
      if (error?.code === "ENETUNREACH" || error?.code === "ETIMEDOUT") {
        logger.error(
          {
            hint: "Set SMTP_FORCE_IPV4=true and optionally SMTP_HOST_IP=<gmail ipv4>, with SMTP_PORT=587, SMTP_SECURE=false, SMTP_REQUIRE_TLS=true.",
          },
          "SMTP connectivity issue detected"
        );
      }
    }
  })();

  try {
    await verifyPromise;
  } finally {
    verifyPromise = null;
  }
};

const sendMailLogged = async (mailOptions, logContext = {}) => {
  const endpoints = await prioritizedEndpoints();
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const transport = createTransport(endpoint);
      const info = await transport.sendMail(mailOptions);
      lastWorkingEndpoint = endpoint;
      logger.info(
        {
          ...logContext,
          host: endpoint.host,
          port: endpoint.port,
          secure: endpoint.secure,
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response,
          provider: "gmail-smtp-app-password",
        },
        "Email send success"
      );
      return info;
    } catch (error) {
      lastError = error;
      logger.warn(
        {
          ...logContext,
          host: endpoint.host,
          port: endpoint.port,
          secure: endpoint.secure,
          err: error,
        },
        "Email send failed for SMTP endpoint candidate"
      );
    }
  }

  logger.error({ ...logContext, err: lastError }, "Email send failed");
  throw lastError;
};

module.exports = {
  verifyEmailTransport,
  sendMailLogged,
};
