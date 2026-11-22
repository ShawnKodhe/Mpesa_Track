import { money } from './ledger.ts';
import { prettyDate, shiftDateKey } from './report-data.ts';
import { categoryColor, emailShell, esc, THEME } from './theme-email.ts';

const k = (value: unknown) => `KES ${money(value)}`;

const sectionTitle = (text: string) => `<tr><td style="padding:24px 32px 2px;font-family:${THEME.body};font-size:10px;font-weight:700;letter-spacing:1.6px;color:${THEME.teal}">${esc(text)}</td></tr>`;

function progressBar(pct: number, color: string): string {
  const width = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${THEME.soft};border-radius:6px"><tr>
    <td width="${width}%" style="height:9px;background:${color};border-radius:6px;font-size:0;line-height:0">&nbsp;</td>
    <td style="height:9px;font-size:0;line-height:0">&nbsp;</td>
  </tr></table>`;
}

function statCell(value: string, label: string, color: string): string {
  return `<td width="33.3%" align="center" style="background:${THEME.soft};border-radius:12px;padding:14px 8px">
    <div style="font-family:${THEME.heading};font-size:19px;font-weight:700;color:${color};white-space:nowrap">${value}</div>
    <div style="padding-top:3px;font-family:${THEME.body};font-size:9px;font-weight:700;letter-spacing:1px;color:${THEME.muted}">${esc(label)}</div>
  </td>`;
}

function dailyChart(daily: Array<{ date: string; amount: number }>, start: string, end: string): string {
  const byDate = new Map(daily.map((item) => [item.date, Math.max(0, Number(item.amount) || 0)]));
  const days: string[] = [];
  for (let key = start; key <= end && days.length < 40; key = shiftDateKey(key, 1)) days.push(key);
  const max = Math.max(1, ...days.map((day) => byDate.get(day) || 0));
  const levels = 4;
  const rows: string[] = [];

  for (let level = levels; level >= 1; level -= 1) {
    const cells = days.map((day) => {
      const value = byDate.get(day) || 0;
      const filled = (value / max) * levels >= level - 0.25;
      return `<td style="height:9px;padding:0;background:${filled ? THEME.teal : THEME.surface}"></td>`;
    }).join('');
    rows.push(`<tr>${cells}</tr>`);
  }
  const labels = days.map((day, index) => {
    const number = Number(day.slice(-2));
    const show = number === 1 || number % 5 === 0 || index === days.length - 1;
    return `<td style="padding:3px 0 0;font-family:${THEME.body};font-size:8px;color:${THEME.muted}">${show ? number : ''}</td>`;
  }).join('');
  rows.push(`<tr>${labels}</tr>`);

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="1" style="table-layout:fixed;background:${THEME.border}">${rows.join('')}</table>`;
}

function jarvisNote(data: any, label: string): string {
  let note: string;
  if (data.transactionCount === 0) {
    note = 'Nothing landed in the ledger this month. Even silence has a price, apparently.';
  } else if (data.net < 0) {
    note = `You spent ${k(Math.abs(data.net))} more than you brought in. A confident approach to arithmetic.`;
  } else if (data.budgets.some((budget: any) => budget.pct > 100)) {
    note = 'At least one budget did not survive the month. I shall pretend to be surprised.';
  } else {
    note = 'You finished ahead and kept your budgets standing. Infuriatingly respectable.';
  }
  return `<tr><td style="padding:20px 32px 6px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${THEME.soft};border-left:3px solid ${THEME.teal};border-radius:8px">
      <tr><td style="padding:16px 18px;font-family:${THEME.body};font-size:12px;line-height:1.7;color:${THEME.ink}">
        <strong style="font-family:${THEME.heading};font-size:13px;color:${THEME.teal}">Jarvis&rsquo;s verdict</strong><br>${esc(note)}
      </td></tr>
    </table>
  </td></tr>`;
}

export function monthlyReportHtml(data: any): string {
  const label = String(data.label || 'Your month');
  const firstName = String(data.firstName || '').trim();
  const greeting = firstName ? `Hello ${esc(firstName)} — here is ${esc(label)} in one glance.` : `Here is ${esc(label)} in one glance.`;

  const statRow = `<tr><td style="padding:10px 32px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${statCell(k(data.spent), 'SPENT', THEME.red)}
      <td width="12" style="font-size:0">&nbsp;</td>
      ${statCell(k(data.received), 'RECEIVED', THEME.green)}
      <td width="12" style="font-size:0">&nbsp;</td>
      ${statCell(k(data.net), 'LEFT OVER', data.net >= 0 ? THEME.teal : THEME.red)}
    </tr></table>
  </td></tr>`;

  const categories = (data.byCategory || []).slice(0, 5);
  const categoryRows = categories.length
    ? categories.map((entry: any, index: number) => `<tr>
        <td style="padding:9px 0 0;font-family:${THEME.body};font-size:12px;color:${THEME.ink}">${esc(entry.category)}</td>
        <td align="right" style="padding:9px 0 0;font-family:${THEME.body};font-size:11px;color:${THEME.muted}">${k(entry.amount)} &middot; ${Math.round(Number(entry.pct) || 0)}%</td>
      </tr><tr><td colspan="2" style="padding:4px 0 0">${progressBar(entry.pct, categoryColor(index))}</td></tr>`).join('')
    : `<tr><td style="padding:10px 0;font-family:${THEME.body};font-size:12px;color:${THEME.muted}">No spending recorded. Remarkable restraint.</td></tr>`;

  const budgetRows = (data.budgets || []).slice(0, 4).map((budget: any) => `<tr>
      <td style="padding:9px 0 0;font-family:${THEME.body};font-size:12px;color:${THEME.ink}">${esc(budget.category)}</td>
      <td align="right" style="padding:9px 0 0;font-family:${THEME.body};font-size:11px;color:${THEME.muted}">${k(budget.spent)} of ${k(budget.amount)}</td>
    </tr><tr><td colspan="2" style="padding:4px 0 0">${progressBar(budget.pct, budget.pct > 100 ? THEME.red : THEME.teal)}</td></tr>`).join('')
    || `<tr><td style="padding:10px 0;font-family:${THEME.body};font-size:12px;color:${THEME.muted}">No active budgets to report on.</td></tr>`;

  const wallet = data.wallet || {};
  const walletCells = [
    ['M-PESA', wallet.mpesa], ['MMF', wallet.mmf], ['M-SHWARI', wallet.mshwari], ['OTHER', wallet.other],
  ].map(([name, amount]) => `<td width="25%" align="center" style="background:${THEME.soft};border-radius:10px;padding:12px 4px">
      <div style="font-family:${THEME.heading};font-size:14px;font-weight:700;color:${THEME.ink}">${money(amount)}</div>
      <div style="padding-top:3px;font-family:${THEME.body};font-size:8px;font-weight:700;letter-spacing:.8px;color:${THEME.muted}">${name}</div>
    </td>`).join('');

  const body = `
    ${statRow}
    ${sectionTitle('Where it went')}
    <tr><td style="padding:8px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${categoryRows}</table></td></tr>

    ${sectionTitle('Daily rhythm')}
    <tr><td style="padding:10px 32px 0"><p style="margin:0 0 10px;font-family:${THEME.body};font-size:11px;color:${THEME.muted}">Spending day by day across the month.</p>${dailyChart(data.daily || [], data.start, data.end)}</td></tr>

    ${sectionTitle('Budget health')}
    <tr><td style="padding:8px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${budgetRows}</table></td></tr>

    ${sectionTitle('Balances')}
    <tr><td style="padding:8px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${walletCells}</tr></table></td></tr>
    <tr><td style="padding:12px 32px 0;font-family:${THEME.body};font-size:11px;color:${THEME.muted}">
      Total <strong style="color:${THEME.teal};font-size:13px">${k(wallet.total)}</strong> as at ${esc(prettyDate(wallet.date || data.end))} &middot; loans ${k(data.loans?.balance)} &middot; owed to you ${k(data.receivables?.balance)}
    </td></tr>

    ${sectionTitle('The Ladder')}
    <tr><td style="padding:8px 32px 0">
      ${progressBar(data.ladder?.pct || 0, THEME.teal)}
      <p style="margin:9px 0 0;font-family:${THEME.body};font-size:11px;color:${THEME.muted}">
        ${k(data.ladder?.current)} of ${k(data.ladder?.target)} &middot; ${Number(data.ladder?.rungs) || 0} rungs, ${Number(data.ladder?.completed) || 0} complete
      </p>
    </td></tr>

    ${jarvisNote(data, label)}`;

  return emailShell({
    eyebrow: 'MONTHLY REPORT',
    title: `${esc(label)}, in numbers.`,
    intro: greeting,
    body,
    ctaLabel: 'Open your ledger',
    ctaHref: data.appUrl,
    footer: `You receive this because you have a MpesaTrack account. Figures cover ${esc(prettyDate(data.start))} to ${esc(prettyDate(data.end))} and exclude money moved between your own accounts.`,
    preheader: `${esc(label)}: spent ${k(data.spent)}, received ${k(data.received)}. Jarvis has thoughts.`,
  });
}
