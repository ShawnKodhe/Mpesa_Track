import {
  INCOME_TYPES,
  isConsumptionRecord,
  isLoanDrawRecord,
  isLoanPrincipalRecord,
  isTransferRecord,
  ledgerTodayKey,
  money,
  sumAmount,
} from './ledger.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

export function shiftDateKey(key: string, days: number): string {
  const parts = String(key).split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return key;
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function previousDayRange(todayKey: string) {
  const day = shiftDateKey(todayKey, -1);
  return { start: day, end: day };
}

export function previousMonthRange(todayKey: string) {
  const yesterday = shiftDateKey(todayKey, -1);
  const [year, month] = yesterday.split('-').map(Number);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const label = new Intl.DateTimeFormat('en-GB', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  return { start, end, label };
}

export function prettyDate(key: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(key || ''))) return String(key || '');
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  }).format(new Date(`${key}T00:00:00Z`));
}

function firstNameOf(fullName: string): string {
  const name = String(fullName || '').trim().split(/\s+/)[0];
  return name || 'sir';
}

/** Every auth user, paired with their profile display name. */
export async function allUsers(client: any): Promise<Array<{ id: string; email: string; full_name: string }>> {
  const users: any[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < 1000) break;
  }

  let profiles: any[] = [];
  try {
    const result = await client.from('profiles').select('id, full_name').limit(5000);
    if (!result.error) profiles = result.data || [];
  } catch (error) {
    console.warn('Could not load profile names for reports:', error);
  }
  const names = new Map(profiles.map((profile) => [profile.id, profile.full_name]));

  return users
    .filter((user) => !!user?.email)
    .map((user) => ({
      id: user.id,
      email: user.email as string,
      full_name: String(names.get(user.id) || user.user_metadata?.full_name || '').trim(),
    }));
}

/**
 * One user's ledger for a date window. `snapshotAsOf` lets a report cover
 * yesterday or last month while still showing the newest known balances.
 */
export async function buildPeriodData(
  client: any,
  ownerId: string,
  start: string,
  end: string,
  snapshotAsOf: string = end,
) {
  const [txResult, budgetResult, loanResult, debtResult, snapshotResult, rungResult, contributionResult] = await Promise.all([
    client.from('transactions').select('*')
      .eq('owner_id', ownerId).gte('transaction_date', start).lte('transaction_date', end)
      .order('transaction_date', { ascending: true }).limit(5000),
    client.from('budgets').select('*').eq('owner_id', ownerId).eq('active', true).limit(200),
    client.from('loans').select('*').eq('owner_id', ownerId).eq('status', 'active').limit(200),
    client.from('debts_owed').select('*').eq('owner_id', ownerId).eq('status', 'outstanding').limit(200),
    client.from('wallet_snapshots').select('*').eq('owner_id', ownerId)
      .lte('snapshot_date', snapshotAsOf).order('snapshot_date', { ascending: false }).limit(1).maybeSingle(),
    client.from('ladder_rungs').select('*').eq('owner_id', ownerId).limit(200),
    client.from('ladder_contributions').select('*').eq('owner_id', ownerId)
      .gte('contribution_date', start).lte('contribution_date', end).limit(500),
  ]);

  for (const result of [txResult, budgetResult, loanResult, debtResult, snapshotResult, rungResult, contributionResult]) {
    if (result.error) throw result.error;
  }

  const transactions = txResult.data || [];
  const spendRows = transactions.filter(isConsumptionRecord);
  const incomeRows = transactions.filter((row: any) => INCOME_TYPES.includes(row?.type));
  const drawRows = transactions.filter(isLoanDrawRecord);
  const principalRows = transactions.filter(isLoanPrincipalRecord);
  const transferRows = transactions.filter(isTransferRecord);

  const spent = sumAmount(spendRows);
  const received = sumAmount(incomeRows);
  const loanDraws = sumAmount(drawRows);
  const principalRepaid = sumAmount(principalRows);
  const moved = sumAmount(transferRows);

  const categoryTotals: Record<string, number> = {};
  const dailyTotals: Record<string, number> = {};
  for (const row of spendRows) {
    const category = String(row?.category || 'Other').trim() || 'Other';
    categoryTotals[category] = (categoryTotals[category] || 0) + Math.max(0, Number(row?.amount) || 0);
    const day = String(row?.transaction_date || '').slice(0, 10);
    if (day) dailyTotals[day] = (dailyTotals[day] || 0) + Math.max(0, Number(row?.amount) || 0);
  }

  const byCategory = Object.entries(categoryTotals)
    .map(([category, amount]) => ({ category, amount, pct: spent > 0 ? Math.round((amount / spent) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount);
  const daily = Object.entries(dailyTotals)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const budgets = (budgetResult.data || []).map((budget: any) => {
    const amount = Math.max(0, Number(budget?.amount) || 0);
    const category = String(budget?.category || '').trim().toLowerCase();
    const budgetSpend = spendRows
      .filter((row: any) => String(row?.category || '').trim().toLowerCase() === category)
      .reduce((total: number, row: any) => total + Math.max(0, Number(row?.amount) || 0), 0);
    return {
      category: String(budget?.category || 'Budget'),
      period: String(budget?.period || 'monthly'),
      amount,
      spent: budgetSpend,
      pct: amount > 0 ? Math.round((budgetSpend / amount) * 100) : 0,
    };
  }).sort((a: any, b: any) => (b.pct - a.pct) || (b.amount - a.amount)).slice(0, 6);

  const snapshot = snapshotResult.data || {};
  const wallet = {
    mpesa: Math.max(0, Number(snapshot.mpesa_balance) || 0),
    mmf: Math.max(0, Number(snapshot.mmf_balance) || 0),
    mshwari: Math.max(0, Number(snapshot.mshwari_balance) || 0),
    other: Math.max(0, Number(snapshot.other_cash) || 0),
    total: Math.max(0, Number(snapshot.total) || 0),
    date: String(snapshot.snapshot_date || ''),
  };

  const rungs = rungResult.data || [];
  const ladder = {
    current: rungs.reduce((total: number, rung: any) => total + (Number(rung?.current_amount) || 0), 0),
    target: rungs.reduce((total: number, rung: any) => total + (Number(rung?.target_amount) || 0), 0),
    rungs: rungs.length,
    completed: rungs.filter((rung: any) => Number(rung?.current_amount) >= Number(rung?.target_amount) && Number(rung?.target_amount) > 0).length,
    contributed: sumAmount(contributionResult.data || []),
  };
  ladder.pct = ladder.target > 0 ? Math.min(100, Math.round((ladder.current / ladder.target) * 100)) : 0;

  return {
    start,
    end,
    spent,
    received,
    loanDraws,
    principalRepaid,
    moved,
    net: received - spent,
    transactionCount: transactions.length,
    byCategory,
    daily,
    budgets,
    wallet,
    loans: {
      balance: (loanResult.data || []).reduce((total: number, loan: any) => total + (Number(loan?.balance) || 0), 0),
      count: (loanResult.data || []).length,
    },
    receivables: {
      balance: (debtResult.data || []).reduce((total: number, debt: any) => total + (Number(debt?.balance) || 0), 0),
      count: (debtResult.data || []).length,
    },
    ladder,
  };
}

/** Short, dry Jarvis note for the in-app daily digest. */
export function jarvisDailyMessage(data: any, fullName: string, dateKey: string): string {
  const name = firstNameOf(fullName);
  const subject = name === 'sir' ? 'Sir' : name;
  const top = data.byCategory.slice(0, 2)
    .map((entry: any) => `${entry.category.toLowerCase()} ${money(entry.amount)}`)
    .join(' and ');
  const opening = data.spent > 0
    ? `${subject}, you spent KES ${money(data.spent)} yesterday${top ? ` — mostly ${top}` : ''}.`
    : `${subject}, not a single shilling spent yesterday. Admirable. Or suspicious.`;
  const wallets = `Wallets: M-PESA ${money(data.wallet.mpesa)}, MMF ${money(data.wallet.mmf)}, M-Shwari ${money(data.wallet.mshwari)} — KES ${money(data.wallet.total)} as of ${prettyDate(data.wallet.date || dateKey)}.`;
  const debts = data.loans.balance > 0
    ? ` Loans still owe KES ${money(data.loans.balance)}. Try to be cheerful about it.`
    : ' No active loans. A miracle, frankly.';
  const closing = data.net >= 0
    ? ' You came out ahead. Do not let it go to your head.'
    : ' You spent more than you brought in. Bold strategy.';
  return `${opening} ${wallets}${debts}${closing}`;
}

/** Nairobi "today" used by the scheduled functions. */
export { ledgerTodayKey };

/** Keeps the day-spanning chart cap explicit if a clock jumps. */
export function daysBetween(start: string, end: string): number {
  return Math.max(0, Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS));
}
