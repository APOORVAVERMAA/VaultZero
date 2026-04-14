const nodemailer = require("nodemailer");
const logger = require("./logger");

let verified = false;

const hasCustomSmtp = Boolean(process.env.SMTP_HOST);
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === "true";

const transportConfig = hasCustomSmtp
  ? {
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    }
  : {
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
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
        provider: hasCustomSmtp ? "custom-smtp" : "gmail",
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: hasCustomSmtp ? smtpPort : 465,
        secure: hasCustomSmtp ? smtpSecure : true,
        emailUser: process.env.EMAIL_USER,
      },
      "Email transport verified"
    );
  } catch (error) {
    logger.error(error, "Email transport verification failed");
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
