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

let verifyPromise = null;
let verified = false;
let lastWorkingHost = null;
let candidateCache = [];
let candidateCacheAt = 0;

const resolveIpv4 = (hostname, _opts, cb) => {
  dns.lookup(hostname, { family: 4, all: false }, cb);
};

const createTransport = (host) => nodemailer.createTransport({
  host,
  port: smtpPort,
  secure: smtpSecure,
  requireTLS: smtpRequireTLS,
  dnsTimeout: 10000,
  // Force IPv4 to avoid Render IPv6 ENETUNREACH when reaching Gmail SMTP.
  ...(forceIpv4 ? { lookup: resolveIpv4 } : {}),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
    servername: smtpHost,
  },
  pool: true,
  maxConnections: 3,
  maxMessages: 100,
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 30000,
});

const buildCandidateHosts = async () => {
  const now = Date.now();
  if (candidateCache.length && now - candidateCacheAt < 10 * 60 * 1000) {
    return [...candidateCache];
  }

  const candidates = [];
  if (smtpHostIp) {
    candidates.push(smtpHostIp);
  }

  try {
    if (forceIpv4) {
      const ipv4Records = await dnsPromises.resolve4(smtpHost);
      candidates.push(...ipv4Records);
    }
  } catch (err) {
    logger.warn({ err, smtpHost }, "Failed resolving SMTP host IPv4 records");
  }

  // Hostname fallback keeps compatibility with environments where DNS is healthy.
  candidates.push(smtpHost);

  // de-duplicate while preserving order
  const deduped = [...new Set(candidates.filter(Boolean))];
  candidateCache = deduped;
  candidateCacheAt = now;
  return deduped;
};

const prioritizedHosts = async () => {
  const candidates = await buildCandidateHosts();
  if (!lastWorkingHost) return candidates;
  return [lastWorkingHost, ...candidates.filter((c) => c !== lastWorkingHost)];
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
      const hosts = await prioritizedHosts();
      let verifiedHost = null;

      for (const host of hosts) {
        try {
          const transport = createTransport(host);
          await transport.verify();
          verifiedHost = host;
          break;
        } catch (verifyErr) {
          logger.warn({ host, err: verifyErr }, "SMTP verify failed for host candidate");
        }
      }

      if (!verifiedHost) {
        throw new Error("All SMTP host candidates failed verification");
      }

      lastWorkingHost = verifiedHost;
      verified = true;
      logger.info(
        {
          provider: "gmail-smtp-app-password",
          host: verifiedHost,
          port: smtpPort,
          secure: smtpSecure,
          requireTLS: smtpRequireTLS,
          forceIpv4,
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
  const hosts = await prioritizedHosts();
  let lastError = null;

  for (const host of hosts) {
    try {
      const transport = createTransport(host);
      const info = await transport.sendMail(mailOptions);
      lastWorkingHost = host;
      logger.info(
        {
          ...logContext,
          host,
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
      logger.warn({ ...logContext, host, err: error }, "Email send failed for SMTP host candidate");
    }
  }

  logger.error({ ...logContext, err: lastError }, "Email send failed");
  throw lastError;
};

module.exports = {
  verifyEmailTransport,
  sendMailLogged,
};
