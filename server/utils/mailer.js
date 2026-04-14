const nodemailer = require("nodemailer");
const logger = require("./logger");
const {
  wrapEmail,
  infoTable,
  ctaButton,
  heading,
  subtext,
  badge,
  noteBox,
  warningBox,
  esc
} = require("./emailTemplate");
const { formatLocation, formatTime } = require("./geolocate");


// ================= TRANSPORTER =================
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // VERY IMPORTANT
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ EMAIL ERROR:", error);
  } else {
    console.log("✅ EMAIL SERVER READY");
  }
});

// ================= VERIFY CONNECTION =================
if (process.env.NODE_ENV !== 'test') {
  transporter.verify((error) => {
    if (error) {
      logger.error(error, "❌ Email transporter failed");
    } else {
      logger.info("✅ Email server ready");
    }
  });
}


// ================= VERIFICATION EMAIL =================
const sendVerificationEmail = async (to, fullName, verificationLink, meta = null) => {
  try {
    const firstName = esc((fullName || '').split(" ")[0] || 'there');
    const timeStr = formatTime(meta?.time);
    const locationStr = meta?.location ? esc(formatLocation(meta.location)) : null;

    const rows = [['Date & Time', timeStr]];
    if (locationStr) rows.push(['Location', locationStr]);
    if (meta?.ip) rows.push(['IP Address', esc(meta.ip)]);

    const body = `
      ${badge('Email Verification', '#6366f1')}
      ${heading('Verify Your Email')}
      ${subtext(`Hey ${firstName}, welcome to VaultZero. Confirm your email address to activate your account and start securing your digital legacy.`)}
      ${infoTable(rows)}
      ${ctaButton(verificationLink, '✔ Verify Email Address')}
      ${noteBox('This link expires in <strong style="color:#e5e7eb;">24 hours</strong>. If you didn\'t create a VaultZero account, you can safely ignore this email.')}
    `;

    await transporter.sendMail({
      from: `"VaultZero Security" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Verify Your Email — VaultZero",
      html: wrapEmail(body),
    });

    logger.info({ to }, 'Verification email sent');

  } catch (error) {
    logger.error(error, "❌ Verification email failed");
  }
};


// ================= DEAD-MAN RELEASE EMAIL =================
const sendReleaseEmail = async (to, vault, ownerEmail, releaseLink) => {
  try {
    const body = `
      ${badge('Dead-Man Vault Release', '#f59e0b')}
      ${heading('Secure Vault Released')}
      ${subtext('A Dead-Man Release Vault has been triggered due to prolonged inactivity of its owner. You have been designated as the recipient of this encrypted vault.')}
      ${infoTable([
        ['Vault ID', `VX-${vault.id}`],
        ['Owner', esc(ownerEmail)],
        ['Created', formatTime(vault.created_at)],
        ['Trigger', `${vault.trigger_days} days inactivity`],
        ['Released', formatTime()],
        ['Triggered By', 'Automated Dead-Man Switch'],
      ])}
      ${ctaButton(releaseLink, '🔐 Access Secure Vault')}
      <div style="margin-top:20px;">
        <p style="color:#6b7280;font-size:11px;margin:4px 0;">• This link can be used only once</p>
        <p style="color:#6b7280;font-size:11px;margin:4px 0;">• It expires in 48 hours</p>
        <p style="color:#6b7280;font-size:11px;margin:4px 0;">• All access attempts are logged</p>
      </div>
      ${warningBox('VaultZero does NOT store or know the original passphrase. Without it, decryption is cryptographically impossible.')}
      ${noteBox('AES-256-GCM • PBKDF2 • HMAC Integrity')}
    `;

    await transporter.sendMail({
      from: `"VaultZero Security" <${process.env.EMAIL_USER}>`,
      to,
      subject: "VaultZero — Vault Released",
      html: wrapEmail(body),
    });

    logger.info({ to, vaultId: vault?.id }, 'Release email sent');

  } catch (error) {
    logger.error(error, "❌ Release email failed");
  }
};


module.exports = {
  sendVerificationEmail,
  sendReleaseEmail
};