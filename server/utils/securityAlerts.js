const logger = require("./logger");
const { sendMailLogged, verifyEmailTransport } = require("./emailTransport");
const { wrapEmail, infoTable, heading, subtext, badge, warningBox, esc } = require("./emailTemplate");
const { formatLocation, formatTime } = require("./geolocate");

const emailProvider = (process.env.EMAIL_PROVIDER || "").toLowerCase().trim() || (process.env.RESEND_API_KEY ? "resend" : "smtp");
const configuredFrom = (process.env.EMAIL_FROM || process.env.EMAIL_USER || "").trim();
const FROM_ADDRESS = emailProvider === "resend"
  ? (configuredFrom && !/@gmail\.com$/i.test(configuredFrom) ? configuredFrom : "VaultZero <onboarding@resend.dev>")
  : configuredFrom;

const formatFromHeader = (sender, displayName) => {
  if (!sender) {
    return sender;
  }

  if (sender.includes("<") && sender.includes(">")) {
    return sender;
  }

  return displayName ? `${displayName} <${sender}>` : sender;
};

const EVENT_CONFIG = {
  vault_opened: {
    subject: "VaultZero Alert — Vault Accessed",
    heading: "Vault Accessed",
    description: "A vault in your account was opened and decrypted successfully.",
    color: "#6366f1",
    badgeLabel: "Vault Access",
  },
  vault_deleted: {
    subject: "VaultZero Alert — Vault Deleted",
    heading: "Vault Permanently Deleted",
    description: "A vault has been permanently deleted from your account. This action cannot be undone.",
    color: "#f87171",
    badgeLabel: "Vault Deleted",
  },
  vault_created: {
    subject: "VaultZero Alert — New Vault Created",
    heading: "New Vault Created",
    description: "A new encrypted vault has been created in your account.",
    color: "#6366f1",
    badgeLabel: "New Vault",
  },
  suspicious_attempts: {
    subject: "VaultZero Alert — Suspicious Access Attempts",
    heading: "Suspicious Access Detected",
    description: "Multiple failed security question attempts were detected on a released vault. Someone may be trying to access your vault without authorization.",
    color: "#f59e0b",
    badgeLabel: "Security Warning",
  },
  vault_released: {
    subject: "VaultZero Alert — Dead-Man Vault Released",
    heading: "Dead-Man Vault Released",
    description: "A dead-man release vault has been triggered due to prolonged inactivity. The designated recipient has been notified.",
    color: "#f59e0b",
    badgeLabel: "Vault Released",
  },
};

const sendSecurityAlert = async (userEmail, eventType, vaultId, meta = null) => {
  const config = EVENT_CONFIG[eventType];
  if (!config) {
    logger.warn({ eventType }, "Unknown security alert event type");
    return;
  }

  const timeStr = formatTime(meta?.time);
  const locationStr = meta?.location ? esc(formatLocation(meta.location)) : null;

  const rows = [
    ['Vault ID', `VX-${vaultId}`],
    ['Date &amp; Time', timeStr],
  ];
  if (locationStr) rows.push(['Location', locationStr]);
  if (meta?.ip) rows.push(['IP Address', esc(meta.ip)]);
  if (!meta) rows.push(['Triggered By', 'Automated System']);

  try {
    const body = `
      ${badge(config.badgeLabel, config.color)}
      ${heading(config.heading)}
      ${subtext(config.description)}
      ${infoTable(rows)}
      ${warningBox('If this was not you, immediately change your password and review your account activity.')}
    `;

    await sendMailLogged({
      from: formatFromHeader(FROM_ADDRESS, "VaultZero Security"),
      to: userEmail,
      subject: config.subject,
      html: wrapEmail(body),
    }, { type: "security-alert", userEmail, eventType, vaultId });
  } catch (err) {
    logger.error(err, `Failed to send security alert: ${eventType}`);
  }
};

const sendLoginAlert = async (userEmail, ip, userAgent, timestamp, location = null) => {
  const timeStr = formatTime(timestamp);
  const locationStr = location ? esc(formatLocation(location)) : null;

  const rows = [['Date &amp; Time', timeStr]];
  if (locationStr) rows.push(['Location', locationStr]);
  rows.push(['IP Address', esc(ip || 'Unknown')]);
  rows.push(['Device', esc(userAgent || 'Unknown')]);

  try {
    const body = `
      ${badge('New Sign-In', '#6366f1')}
      ${heading('New Login Detected')}
      ${subtext('A new sign-in was detected on your VaultZero account. If this was you, no action is needed.')}
      ${infoTable(rows)}
      ${warningBox('If this was not you, immediately change your password and secure your account.')}
    `;

    await sendMailLogged({
      from: formatFromHeader(FROM_ADDRESS, "VaultZero Security"),
      to: userEmail,
      subject: "VaultZero Security — New Login Detected",
      html: wrapEmail(body),
    }, { type: "login-alert", userEmail });
  } catch (err) {
    logger.error(err, "Failed to send login alert email");
  }
};

module.exports = { sendSecurityAlert, sendLoginAlert };
