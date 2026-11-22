import { serviceClient } from './mod.ts';
import { ledgerTodayKey, money } from './ledger.ts';
import { budgetAlertHtml, sendEmail } from './email.ts';

const OUTFLOW_TYPES = ['sent', 'payment', 'withdrawal', 'airtime'];
const LOAN_RULES_CUTOVER = '2026-11-19';

/** Shared by the edge function and ledger writers; safe to call repeatedly. */
export async function evaluateBudgetAlert(transactionId: string, expectedOwnerId?: string) {
  const admin = serviceClient();
  const { data: transaction, error } = await admin
    .from('transactions').select('*').eq('id', transactionId).maybeSingle();
  if (error) throw error;
  if (!transaction) return { sent: false, reason: 'Transaction not found' };
  if (expectedOwnerId && transaction.owner_id !== expectedOwnerId) {
    return { sent: false, reason: 'Not your transaction' };
  }
  if (!OUTFLOW_TYPES.includes(transaction.type)) return { sent: false, reason: 'Not an outflow transaction' };

  const dayKey = String(transaction.transaction_date || '').slice(0, 10);
  if (String(transaction.category || '').trim().toLowerCase() === 'loan principal' && dayKey >= LOAN_RULES_CUTOVER) {
    return { sent: false, reason: 'Loan principal is not spending' };
  }

  const ownerId = transaction.owner_id;
  const { data: budgets } = await admin.from('budgets').select('*')
    .eq('owner_id', ownerId)
    .eq('category', transaction.category)
    .eq('period', 'monthly')
    .neq('active', false);
  if (!budgets?.length) return { sent: false, reason: 'No matching monthly budget' };

  const monthStart = `${ledgerTodayKey().slice(0, 7)}-01`;
  const { data: monthTransactions } = await admin.from('transactions').select('amount')
    .eq('owner_id', ownerId)
    .eq('category', transaction.category)
    .in('type', OUTFLOW_TYPES)
    .gte('transaction_date', monthStart);
  const totalSpent = (monthTransactions || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  const [{ data: authUser }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(ownerId),
    admin.from('profiles').select('full_name').eq('id', ownerId).maybeSingle(),
  ]);
  const email = authUser?.user?.email;
  if (!email) return { sent: false, reason: 'User not found' };
  const firstName = String(profile?.full_name || email.split('@')[0]).split(' ')[0];

  let alerts = 0;
  for (const budget of budgets) {
    const limit = Number(budget.amount) || 0;
    const pct = limit > 0 ? (totalSpent / limit) * 100 : 0;
    if (pct < 80) continue;

    const isOver = pct > 100;
    const variables = {
      first_name: firstName,
      category: budget.category,
      budget_amount: money(limit),
      spent: money(totalSpent),
      percentage: Math.round(pct),
      remaining: money(Math.max(0, limit - totalSpent)),
      over_amount: money(Math.max(0, totalSpent - limit)),
      status: isOver ? 'over' : 'warning',
      period: budget.period || 'monthly',
    };
    await sendEmail({
      to: email,
      subject: `Budget ${isOver ? 'exceeded' : 'alert'}: ${budget.category} at ${variables.percentage}%`,
      html: budgetAlertHtml(variables),
    });
    alerts++;
  }

  return { sent: alerts > 0, alerts };
}
