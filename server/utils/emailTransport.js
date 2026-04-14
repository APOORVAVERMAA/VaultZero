const logger = require("./logger");
const nodemailer = require("nodemailer");

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === "true";
const smtpRequireTLS = process.env.SMTP_REQUIRE_TLS !== "false";

const smtpTransport = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  requireTLS: smtpRequireTLS,
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
  if (process.env.NODE_ENV === "test") {
    return;
  }

  try {
    await smtpTransport.verify();
    logger.info(
      {
        provider: "gmail-smtp-app-password",
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        requireTLS: smtpRequireTLS,
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
          hint: "Render cannot reach Gmail SMTP. Use SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_SECURE=false, SMTP_REQUIRE_TLS=true, NODE_OPTIONS=--dns-result-order=ipv4first.",
        },
        "SMTP connectivity issue detected"
      );
    }
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
