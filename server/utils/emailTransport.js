const nodemailer = require("nodemailer");
const logger = require("./logger");

let verified = false;

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === "true";
const smtpRequireTLS = process.env.SMTP_REQUIRE_TLS !== "false";

const transportConfig = {
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
};

const transporter = nodemailer.createTransport({
  ...transportConfig,
  pool: true,
  maxConnections: 3,
  maxMessages: 100,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

const verifyEmailTransport = async () => {
  if (process.env.NODE_ENV === "test" || verified) {
    return;
  }

  try {
    await transporter.verify();
    verified = true;
    logger.info(
      {
        provider: smtpHost === "smtp.gmail.com" ? "gmail" : "custom-smtp",
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        requireTLS: smtpRequireTLS,
        emailUser: process.env.EMAIL_USER,
      },
      "Email transport verified"
    );
  } catch (error) {
    logger.error(error, "Email transport verification failed");
    if (error?.code === "ENETUNREACH" || error?.code === "ETIMEDOUT") {
      logger.error(
        {
          hint: "Set NODE_OPTIONS=--dns-result-order=ipv4first and SMTP_PORT=587, SMTP_SECURE=false, SMTP_REQUIRE_TLS=true in Render env",
        },
        "SMTP connectivity issue detected"
      );
    }
  }
};

const sendMailLogged = async (mailOptions, logContext = {}) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(
      {
        ...logContext,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
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
  transporter,
  verifyEmailTransport,
  sendMailLogged,
};
