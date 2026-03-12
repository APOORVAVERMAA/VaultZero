const FONT = "'JetBrains Mono','Fira Code','Courier New',monospace";

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const DASHBOARD_URL = () => process.env.FRONTEND_URL || 'http://localhost:3000';

// Colors matched exactly to tailwind.config.js
const C = {
  bg: '#07090d',
  surface: '#0c1017',
  surfaceLight: '#111621',
  border: '#1a1f2e',
  borderGlow: '#6366f140',
  primary: '#6366f1',
  primaryDim: '#4f46e5',
  accent: '#22d3ee',
  textWhite: '#e5e7eb',
  textMuted: '#6b7280',
  textDim: '#374151',
};

// Inline SVG mesh grid as base64 data URI (matches website's mesh pattern)
const MESH_GRID = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M40 0L0 0 0 40' fill='none' stroke='%236366f1' stroke-width='0.5' opacity='0.08'/%3E%3C/svg%3E")`;

// Shield icon SVG (inline, indigo-tinted)
const SHIELD_ICON = `<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3Cpath d='M9 12l2 2 4-4' stroke='%2322d3ee' stroke-width='1.5'/%3E%3C/svg%3E" width="28" height="28" alt="" style="display:block;" />`;

const wrapEmail = (bodyHtml) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>VaultZero</title></head>
<body bgcolor="${C.bg}" style="margin:0;padding:0;background-color:${C.bg};font-family:${FONT};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Force dark bg on entire email -->
<div style="background-color:${C.bg};min-height:100%;width:100%;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="${C.bg}" style="background-color:${C.bg};background-image:${MESH_GRID};background-repeat:repeat;">
<tr><td align="center" bgcolor="${C.bg}" style="background-color:${C.bg};padding:40px 16px 48px;">

<table width="560" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:560px;width:100%;">

  <!-- Top security bar -->
  <tr><td bgcolor="${C.surface}" style="background-color:${C.surface};padding:14px 28px;border:1px solid ${C.border};border-bottom:none;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="font-family:${FONT};font-size:9px;color:${C.accent};letter-spacing:2px;text-transform:uppercase;">
        &#9670; ENCRYPTED TRANSMISSION
      </td>
      <td align="right" style="font-family:${FONT};font-size:9px;color:${C.textDim};letter-spacing:1px;">
        AES-256-GCM
      </td>
    </tr></table>
  </td></tr>

  <!-- Glow accent line -->
  <tr><td style="height:1px;font-size:0;line-height:0;border-left:1px solid ${C.border};border-right:1px solid ${C.border};">
    <div style="height:1px;background:linear-gradient(90deg,${C.primaryDim},${C.primary},${C.accent},${C.primary},${C.primaryDim});">&nbsp;</div>
    <!--[if mso]><hr style="border:0;height:1px;background:${C.primary};"><![endif]-->
  </td></tr>

  <!-- Header with shield + logo -->
  <tr><td bgcolor="${C.bg}" style="background-color:${C.bg};padding:28px 28px 24px;border-left:1px solid ${C.border};border-right:1px solid ${C.border};">
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding-right:14px;vertical-align:middle;">
        ${SHIELD_ICON}
      </td>
      <td style="vertical-align:middle;">
        <div style="font-family:${FONT};font-size:22px;font-weight:700;letter-spacing:-0.5px;line-height:1;">
          <span style="color:#ffffff;">Vault</span><span style="color:${C.primary};">Zero</span>
        </div>
        <div style="margin-top:4px;font-family:${FONT};font-size:9px;letter-spacing:3px;color:${C.textDim};">
          secure. private. permanent.
        </div>
      </td>
    </tr></table>
  </td></tr>

  <!-- Body panel -->
  <tr><td bgcolor="${C.surface}" style="background-color:${C.surface};padding:32px 28px;border-left:1px solid ${C.border};border-right:1px solid ${C.border};font-family:${FONT};">
    ${bodyHtml}
  </td></tr>

  <!-- Bottom glow line -->
  <tr><td style="height:1px;font-size:0;line-height:0;border-left:1px solid ${C.border};border-right:1px solid ${C.border};">
    <div style="height:1px;background:linear-gradient(90deg,${C.primaryDim},${C.primary},${C.accent},${C.primary},${C.primaryDim});">&nbsp;</div>
    <!--[if mso]><hr style="border:0;height:1px;background:${C.primary};"><![endif]-->
  </td></tr>

  <!-- Footer -->
  <tr><td bgcolor="${C.bg}" style="background-color:${C.bg};padding:20px 28px;border:1px solid ${C.border};border-top:none;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="font-family:${FONT};">
        <a href="${DASHBOARD_URL()}" target="_blank" style="color:${C.primary};font-size:10px;text-decoration:none;font-family:${FONT};letter-spacing:0.5px;">Open Dashboard &#8594;</a>
      </td>
      <td align="right" style="font-family:${FONT};font-size:9px;color:${C.textDim};letter-spacing:0.5px;">
        Zero-Knowledge &#183; E2E Encrypted
      </td>
    </tr></table>
  </td></tr>

  <!-- Bottom edge cap -->
  <tr><td style="font-size:0;line-height:0;">
    <div style="height:2px;background:linear-gradient(90deg,transparent,${C.border},transparent);">&nbsp;</div>
  </td></tr>

</table>

</td></tr>
</table>
</div>

</body></html>`;

const infoTable = (rows) => {
  const trs = rows.map(([label, value], i) => {
    const isLast = i === rows.length - 1;
    const border = isLast ? '' : `border-bottom:1px solid ${C.border};`;
    return `<tr>
      <td style="color:${C.textMuted};font-size:10px;padding:8px 12px;${border}font-family:${FONT};white-space:nowrap;">
        <span style="color:${C.textDim};margin-right:4px;">&#9656;</span> ${label}
      </td>
      <td style="color:${C.textWhite};font-size:10px;padding:8px 12px;${border}text-align:right;font-family:${FONT};word-break:break-all;">${value}</td>
    </tr>`;
  }).join('');

  return `<div style="margin:18px 0;overflow:hidden;border:1px solid ${C.border};">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="background-color:${C.bg};border-collapse:collapse;">
      ${trs}
    </table>
  </div>`;
};

const ctaButton = (href, text) =>
  `<div style="text-align:center;margin:28px 0 8px;">
    <a href="${href}" target="_blank" style="display:inline-block;background-color:${C.primary};color:#ffffff;padding:11px 32px;text-decoration:none;font-weight:600;font-size:11px;letter-spacing:0.8px;font-family:${FONT};border:1px solid ${C.borderGlow};">
      ${text}
    </a>
  </div>`;

const heading = (text) =>
  `<h2 style="color:#ffffff;font-size:18px;margin:0 0 8px;font-weight:600;font-family:${FONT};line-height:1.3;letter-spacing:-0.3px;">${text}</h2>`;

const subtext = (text) =>
  `<p style="color:${C.textMuted};font-size:12px;margin:0 0 4px;line-height:1.7;font-family:${FONT};">${text}</p>`;

const badge = (text, color) => {
  return `<div style="margin-bottom:14px;">
    <span style="display:inline-block;font-size:9px;font-weight:600;font-family:${FONT};letter-spacing:1.5px;text-transform:uppercase;color:${color};border:1px solid ${color}40;padding:4px 10px;background-color:${color}10;">&#9679; ${text}</span>
  </div>`;
};

const warningBox = (text) =>
  `<div style="margin-top:18px;padding:12px 14px;border-left:2px solid #f87171;background-color:#f8717108;border:1px solid #f8717120;border-left:2px solid #f87171;">
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:top;padding-right:8px;font-size:12px;">&#9888;</td>
      <td><p style="color:#fca5a5;font-size:11px;margin:0;line-height:1.6;font-family:${FONT};">${text}</p></td>
    </tr></table>
  </div>`;

const noteBox = (text) =>
  `<div style="margin-top:14px;padding:12px 14px;border-left:2px solid ${C.border};background-color:${C.bg};">
    <p style="color:${C.textMuted};font-size:11px;margin:0;line-height:1.6;font-family:${FONT};">${text}</p>
  </div>`;

module.exports = { wrapEmail, infoTable, ctaButton, heading, subtext, badge, warningBox, noteBox, esc, FONT };
