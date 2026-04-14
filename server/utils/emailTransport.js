const logger = require("./logger");
const nodemailer = require("nodemailer");
const dns = require("dns");

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

const resolveIpv4 = (hostname, _opts, cb) => {
  dns.lookup(hostname, { family: 4, all: false }, cb);
};

const smtpTransport = nodemailer.createTransport({
  host: smtpHostIp || smtpHost,
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
      await smtpTransport.verify();
      verified = true;
      logger.info(
        {
          provider: "gmail-smtp-app-password",
          host: smtpHostIp || smtpHost,
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
  try {
    const info = await smtpTransport.sendMail(mailOptions);
    logger.info(
      {
        ...logContext,
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
    logger.error({ ...logContext, err: error }, "Email send failed");
    throw error;
  }
};

module.exports = {
  verifyEmailTransport,
  sendMailLogged,
};
