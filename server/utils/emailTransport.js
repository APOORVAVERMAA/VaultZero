const logger = require("./logger");
const nodemailer = require("nodemailer");
const dns = require("dns");
const dnsPromises = require("dns").promises;

const emailProvider = (process.env.EMAIL_PROVIDER || "smtp").toLowerCase();
const resendApiKey = process.env.RESEND_API_KEY;
const resendApiBaseUrl = process.env.RESEND_API_BASE_URL || "https://api.resend.com";

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
const smtpConnectionTimeout = Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 8000);
const smtpGreetingTimeout = Number(process.env.SMTP_GREETING_TIMEOUT_MS || 8000);
const smtpSocketTimeout = Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 12000);
const smtpFailThreshold = Number(process.env.SMTP_FAIL_THRESHOLD || 2);
const smtpBlockCooldownMs = Number(process.env.SMTP_BLOCK_COOLDOWN_MS || 10 * 60 * 1000);

let verifyPromise = null;
let verified = false;
let lastWorkingEndpoint = null;
let candidateCache = [];
let candidateCacheAt = 0;
let consecutiveConnectivityFailures = 0;
let smtpBlockedUntil = 0;

const withTimeout = async (fn, timeoutMs, timeoutMessage) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fn(controller.signal);
  } catch (err) {
    if (err?.name === "AbortError") {
      const timeoutErr = new Error(timeoutMessage);
      timeoutErr.code = "ETIMEDOUT";
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

const normalizeRecipients = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((item) => normalizeRecipients(item));
  if (typeof value === "string") {
    return value.split(",").map((part) => part.trim()).filter(Boolean);
  }
  return [String(value)];
};

const verifyResendTransport = async () => {
  if (!resendApiKey) {
    throw new Error("Missing RESEND_API_KEY for EMAIL_PROVIDER=resend");
  }

  await withTimeout(
    async (signal) => {
      const response = await fetch(`${resendApiBaseUrl}/domains`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
        },
        signal,
      });

      if (!response.ok) {
        const body = await response.text();
        const err = new Error(`Resend verify failed (${response.status}) ${body}`);
        err.code = `ERESEND_${response.status}`;
        throw err;
      }
    },
    8000,
    "Resend verify timeout"
  );
};

const sendWithResend = async (mailOptions, logContext = {}) => {
  if (!resendApiKey) {
    const err = new Error("Missing RESEND_API_KEY for EMAIL_PROVIDER=resend");
    err.code = "ERESENDKEY";
    throw err;
  }

  const payload = {
    from: mailOptions.from,
    to: mailOptions.to,
    subject: mailOptions.subject,
    html: mailOptions.html,
    text: mailOptions.text,
    cc: mailOptions.cc,
    bcc: mailOptions.bcc,
    reply_to: mailOptions.replyTo,
  };

  const response = await withTimeout(
    async (signal) => fetch(`${resendApiBaseUrl}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    }),
    smtpSocketTimeout,
    "Resend send timeout"
  );

  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }

  if (!response.ok) {
    const err = new Error(`Resend send failed (${response.status}) ${raw}`);
    err.code = `ERESEND_${response.status}`;
    throw err;
  }

  const accepted = normalizeRecipients(mailOptions.to);
  const info = {
    messageId: data.id,
    accepted,
    rejected: [],
    response: raw,
  };

  logger.info(
    {
      ...logContext,
      provider: "resend-api",
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    },
    "Email send success"
  );

  return info;
};

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
  connectionTimeout: smtpConnectionTimeout,
  greetingTimeout: smtpGreetingTimeout,
  socketTimeout: smtpSocketTimeout,
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

const isConnectivityError = (error) => {
  const connectivityCodes = new Set(["ETIMEDOUT", "ENETUNREACH", "ECONNRESET", "ECONNREFUSED", "EHOSTUNREACH"]);
  return connectivityCodes.has(error?.code);
};

const noteConnectivityFailure = () => {
  consecutiveConnectivityFailures += 1;
  if (consecutiveConnectivityFailures >= smtpFailThreshold) {
    smtpBlockedUntil = Date.now() + smtpBlockCooldownMs;
    logger.error(
      {
        consecutiveConnectivityFailures,
        smtpFailThreshold,
        smtpBlockCooldownMs,
      },
      "SMTP circuit breaker opened due to repeated connectivity failures"
    );
  }
};

const clearConnectivityFailureState = () => {
  consecutiveConnectivityFailures = 0;
  smtpBlockedUntil = 0;
};

const maybeShortCircuit = () => {
  if (!smtpBlockedUntil) return false;
  if (Date.now() >= smtpBlockedUntil) {
    smtpBlockedUntil = 0;
    return false;
  }
  return true;
};

const verifyEmailTransport = async () => {
  if (process.env.NODE_ENV === "test" || verified) {
    return;
  }

  if (emailProvider === "resend") {
    if (verifyPromise) {
      await verifyPromise;
      return;
    }

    verifyPromise = (async () => {
      try {
        await verifyResendTransport();
        verified = true;
        logger.info(
          {
            provider: "resend-api",
            sender: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          },
          "Email transport verified"
        );
      } catch (error) {
        logger.error(error, "Email transport verification failed");
      }
    })();

    try {
      await verifyPromise;
    } finally {
      verifyPromise = null;
    }
    return;
  }

  if (maybeShortCircuit()) {
    logger.warn(
      {
        blockedUntil: new Date(smtpBlockedUntil).toISOString(),
      },
      "Skipping SMTP verify while circuit breaker is open"
    );
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
      clearConnectivityFailureState();
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
      if (isConnectivityError(error)) {
        noteConnectivityFailure();
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
  if (emailProvider === "resend") {
    return sendWithResend(mailOptions, logContext);
  }

  if (maybeShortCircuit()) {
    const shortCircuitError = new Error("SMTP temporarily unavailable due to repeated connectivity failures");
    shortCircuitError.code = "ESMTPBLOCKED";
    logger.warn(
      {
        ...logContext,
        blockedUntil: new Date(smtpBlockedUntil).toISOString(),
      },
      "Skipping email send while SMTP circuit breaker is open"
    );
    throw shortCircuitError;
  }

  const endpoints = await prioritizedEndpoints();
  let lastError = null;
  let sawConnectivityFailure = false;

  for (const endpoint of endpoints) {
    try {
      const transport = createTransport(endpoint);
      const info = await transport.sendMail(mailOptions);
      lastWorkingEndpoint = endpoint;
      clearConnectivityFailureState();
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
      if (isConnectivityError(error)) {
        sawConnectivityFailure = true;
      }
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

  if (sawConnectivityFailure) {
    noteConnectivityFailure();
  }

  logger.error({ ...logContext, err: lastError }, "Email send failed");
  throw lastError;
};

module.exports = {
  verifyEmailTransport,
  sendMailLogged,
};
