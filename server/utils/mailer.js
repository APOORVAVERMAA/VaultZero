const logger = require("./logger");
const { sendMailLogged, verifyEmailTransport } = require("./emailTransport");
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

const shouldPreflightEmail = (process.env.EMAIL_PROVIDER || "").toLowerCase().trim() === "resend" || Boolean(process.env.RESEND_API_KEY && !process.env.EMAIL_PROVIDER);
let emailTransportInitialized = false;
const ensureEmailTransportReady = async () => {
  if (emailTransportInitialized || !shouldPreflightEmail) {
    return;
  }

  emailTransportInitialized = true;
  setImmediate(() => verifyEmailTransport().catch(err => 
    logger.warn(err, "Background email transport verification failed")
  ));
};

const emailProvider = (process.env.EMAIL_PROVIDER || "").toLowerCase().trim() || (process.env.RESEND_API_KEY ? "resend" : "smtp");
const FROM_ADDRESS = (process.env.EMAIL_FROM || process.env.EMAIL_USER || "").trim();

if (emailProvider === "resend" && !FROM_ADDRESS) {
  throw new Error("EMAIL_FROM is required when EMAIL_PROVIDER=resend");
}


// ================= VERIFICATION EMAIL =================
const sendVerificationEmail = async (to, fullName, verificationLink, meta = null) => {
  try {
    ensureEmailTransportReady();
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

    await sendMailLogged({
      from: `"VaultZero Security" <${FROM_ADDRESS}>`,
      to,
      subject: "Verify Your Email — VaultZero",
      html: wrapEmail(body),
    }, { type: "verification", to });

  } catch (error) {
    logger.error(error, "Verification email failed");
  }
};


// ================= DEAD-MAN RELEASE EMAIL =================
const sendReleaseEmail = async (to, vault, ownerEmail, releaseLink) => {
  try {
    ensureEmailTransportReady();
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

    await sendMailLogged({
      from: `"VaultZero Security" <${FROM_ADDRESS}>`,
      to,
      subject: "VaultZero — Vault Released",
      html: wrapEmail(body),
    }, { type: "release", to, vaultId: vault?.id });

  } catch (error) {
    logger.error(error, "Release email failed");
  }
};


module.exports = {
  sendVerificationEmail,
  sendReleaseEmail
};