/**
 * Email-safe version of MpesaTrack's "paper" theme (src/index.css). Values are
 * the paper palette converted from HSL to hex, with no CSS variables, webfonts
 * or flexbox — everything uses nested tables and inline styles for Outlook,
 * Gmail and Apple Mail.
 */
export const THEME = {
  paper: '#F7F5F0',
  soft: '#F0EDE5',
  surface: '#FFFFFF',
  ink: '#252B31',
  muted: '#5A6672',
  teal: '#0F706D',
  tealSoft: '#E4F1EF',
  red: '#B42318',
  green: '#1E7B34',
  amber: '#C03F0C',
  border: '#E3DFD5',
  navy: '#0B1220',
  greenBright: '#4ADE80',
  purple: '#A78BFA',
  heading: "Georgia, 'Times New Roman', serif",
  body: 'Arial, Helvetica, sans-serif',
  category: [
    '#3A30A6', '#197673', '#B33D0F', '#22773E', '#AB2B2B', '#14688F', '#6F34B2',
    '#A55E0D', '#A02261', '#476F2A', '#1F5AAD', '#B34C19', '#636B74', '#A12BAB',
  ],
};

export const esc = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function categoryColor(index: number): string {
  return THEME.category[Math.abs(index) % THEME.category.length];
}

export function brandMark(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="width:36px;height:36px;background:${THEME.navy};border-radius:10px;text-align:center;vertical-align:middle;font-family:${THEME.heading};font-size:23px;font-weight:700;color:${THEME.greenBright};line-height:36px;">M</td>
    <td style="padding-left:10px;font-family:${THEME.heading};font-size:17px;font-weight:700;color:${THEME.ink};letter-spacing:.2px">MpesaTrack</td>
    <td style="padding-left:5px;font-size:18px;line-height:1;color:${THEME.purple};vertical-align:top">&#9679;</td>
  </tr></table>`;
}

type ShellArgs = {
  eyebrow: string;
  title: string;
  intro: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  footer?: string;
  preheader?: string;
};

export function emailShell({ eyebrow, title, intro, body, ctaLabel, ctaHref, footer, preheader }: ShellArgs): string {
  const cta = ctaLabel && ctaHref
    ? `<tr><td style="padding:6px 32px 30px"><a href="${esc(ctaHref)}" style="display:inline-block;background:${THEME.teal};color:#FFFFFF;text-decoration:none;font-family:${THEME.body};font-size:14px;font-weight:700;padding:13px 22px;border-radius:10px">${esc(ctaLabel)} &rarr;</a></td></tr>`
    : '';
  const note = footer
    ? `<tr><td style="padding:18px 32px 28px;border-top:1px solid ${THEME.border};color:${THEME.muted};font-family:${THEME.body};font-size:11px;line-height:1.6">${footer}</td></tr>`
    : '';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${THEME.paper};color:${THEME.ink}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader || title)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${THEME.paper}"><tr><td align="center" style="padding:30px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:${THEME.surface};border-radius:18px">
    <tr><td style="padding:24px 32px;background:${THEME.navy};border-radius:18px 18px 0 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td>${brandMark()}</td>
        <td align="right" style="font-family:${THEME.body};font-size:10px;font-weight:700;letter-spacing:1.6px;color:${THEME.purple}">${esc(eyebrow)}</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:30px 32px 8px">
      <h1 style="margin:0 0 10px;font-family:${THEME.heading};font-size:28px;line-height:1.2;font-weight:700;color:${THEME.ink}">${title}</h1>
      <p style="margin:0;font-family:${THEME.body};font-size:14px;line-height:1.7;color:${THEME.muted}">${intro}</p>
    </td></tr>
    ${body}
    ${cta}
    ${note}
  </table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px"><tr><td align="center" style="padding:18px 8px 4px;font-family:${THEME.body};font-size:11px;color:${THEME.muted}">MpesaTrack &mdash; your money, clearly.</td></tr></table>
</td></tr></table></body></html>`;
}

export function confirmationEmailHtml({ firstName, appUrl }: { firstName: string; appUrl: string }): string {
  const name = String(firstName || '').trim();
  const title = name ? `You're in, ${esc(name)}.` : "You're in.";
  const features = [
    ['01', 'See every M-Pesa move', 'Imports, balances and categories, all in one calm view.'],
    ['02', 'Set budgets that talk back', 'Jarvis tells you when a category is getting loud.'],
    ['03', 'Ask Jarvis anything', 'Your ledger, your loans, your Ladder — in plain language.'],
  ].map(([number, heading, copy]) => `<tr>
    <td style="width:34px;vertical-align:top;padding:10px 8px 10px 0;font-family:${THEME.body};font-size:11px;font-weight:700;color:${THEME.teal}">${number}</td>
    <td style="padding:10px 0;border-bottom:1px solid ${THEME.border};font-family:${THEME.body};font-size:13px;line-height:1.6">
      <strong style="color:${THEME.ink}">${esc(heading)}</strong><br><span style="color:${THEME.muted}">${esc(copy)}</span>
    </td>
  </tr>`).join('');

  return emailShell({
    eyebrow: 'ACCOUNT CONFIRMED',
    title,
    intro: 'Your MpesaTrack account is ready. No extra verification step, no hoops — just your money, clearly.',
    body: `<tr><td style="padding:18px 32px 8px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${THEME.soft};border-radius:12px">
        <tr><td style="padding:8px 18px">${features ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${features}</table>` : ''}</td></tr>
      </table>
    </td></tr>`,
    ctaLabel: 'Open your ledger',
    ctaHref: appUrl,
    footer: 'This confirmation was sent by MpesaTrack because an account was created with this address. If that was not you, you can safely ignore this message.',
    preheader: 'Your MpesaTrack account is confirmed and ready to use.',
  });
}

export function passwordResetHtml({ firstName, resetUrl, destination }: {
  firstName: string;
  resetUrl: string;
  destination: string;
}): string {
  const name = String(firstName || '').trim();
  return emailShell({
    eyebrow: 'PASSWORD RESET',
    title: "Let's get you back in.",
    intro: name
      ? `${esc(name)}, we received a request to reset your MpesaTrack password. One tap and you are back in charge.`
      : 'We received a request to reset your MpesaTrack password. One tap and you are back in charge.',
    body: `<tr><td style="padding:18px 32px 8px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${THEME.soft};border-radius:12px">
        <tr><td style="padding:16px 18px;font-family:${THEME.body};font-size:12px;line-height:1.7;color:${THEME.ink}">
          This link was sent to <strong style="color:${THEME.teal}">${esc(destination)}</strong>. It can only be used once and expires shortly.
        </td></tr>
      </table>
    </td></tr>`,
    ctaLabel: 'Reset your password',
    ctaHref: resetUrl,
    footer: 'Did not request this? Ignore this email and nothing will change. Your password stays exactly as it was. MpesaTrack will never ask you for your password by email.',
    preheader: 'Your MpesaTrack password reset link is ready.',
  });
}

export function verifySecondaryEmailHtml({ firstName, verifyUrl, email }: {
  firstName: string;
  verifyUrl: string;
  email: string;
}): string {
  const name = String(firstName || '').trim();
  return emailShell({
    eyebrow: 'VERIFY EMAIL',
    title: 'One more way in.',
    intro: name
      ? `${esc(name)}, you added ${esc(email)} as a backup address on MpesaTrack. Confirm it below and you can use it to reset your password if you ever lose access to your main inbox.`
      : `You added ${esc(email)} as a backup address on MpesaTrack. Confirm it below and you can use it to reset your password if you ever lose access to your main inbox.`,
    body: `<tr><td style="padding:18px 32px 8px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${THEME.tealSoft};border-left:3px solid ${THEME.teal};border-radius:8px">
        <tr><td style="padding:16px 18px;font-family:${THEME.body};font-size:12px;line-height:1.7;color:${THEME.ink}">
          <strong>Why this matters:</strong> a verified backup address is the only one we will send password-reset links to besides your primary email. Until you verify it, it cannot be used.
        </td></tr>
      </table>
    </td></tr>`,
    ctaLabel: 'Verify this address',
    ctaHref: verifyUrl,
    footer: 'If you did not add this address, ignore this email. Your account is unchanged.',
    preheader: 'Confirm your MpesaTrack backup email address.',
  });
}
