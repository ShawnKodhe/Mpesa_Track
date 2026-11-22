const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM') || 'MpesaTrack <onboarding@resend.dev>';
  if (!key) {
    console.warn('RESEND_API_KEY is not configured; skipping email to', to);
    return false;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    console.error('Resend refused the email:', await response.text());
    return false;
  }
  return true;
}

export function budgetAlertHtml(variables: Record<string, unknown>): string {
  const category = escapeHtml(variables.category);
  const percentage = escapeHtml(variables.percentage);
  const period = escapeHtml(variables.period || 'monthly');
  const isOver = variables.status === 'over';
  const accent = isOver ? '#dc2626' : '#d97706';
  const banner = isOver
    ? `You are <strong>${escapeHtml(variables.over_amount)} KES</strong> over this ${period} budget.`
    : `You have <strong>${escapeHtml(variables.remaining)} KES</strong> left for this ${period}.`;

  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
      <tr><td style="padding:28px 36px 8px"><h1 style="margin:0;font-size:22px">Budget ${isOver ? 'exceeded' : 'alert'}: ${category}</h1></td></tr>
      <tr><td style="padding:8px 36px 24px;color:#52525b;line-height:1.6">
        <p>Hello ${escapeHtml(variables.first_name)},</p>
        <p>Your <strong>${category}</strong> spending is at <strong>${percentage}%</strong> of your ${period} budget.</p>
        <p style="color:${accent}">${banner}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e4e4e7;border-radius:12px;margin:20px 0">
          <tr><td style="padding:12px 16px">Budget</td><td align="right" style="padding:12px 16px"><strong>${escapeHtml(variables.budget_amount)} KES</strong></td></tr>
          <tr><td style="padding:12px 16px">Spent</td><td align="right" style="padding:12px 16px"><strong>${escapeHtml(variables.spent)} KES</strong></td></tr>
        </table>
        <a href="https://mpesatrack.com/budget" style="background:#0b1220;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;display:inline-block">Review your budget</a>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}
