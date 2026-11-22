/**
 * Loan integrity: a loan draw always has a Loan, and a principal repayment
 * reduces the oldest active balance for that lender, never below zero.
 */
import { insertRow, listRows, updateRow } from './mod.ts';

export const lenderKey = (name: unknown) => String(name || '').trim().toLowerCase();
export const isLoanDrawTransaction = (transaction: any) => !!transaction && transaction.type === 'loan';
export const isLoanPrincipalTransaction = (transaction: any) =>
  String(transaction?.category || '').trim().toLowerCase() === 'loan principal';
export const isLoanInterestTransaction = (transaction: any) =>
  String(transaction?.category || '').trim().toLowerCase() === 'loan interest';
export const isTradeDebtRecord = (loan: any) => loan?.debt_type === 'trade_debt';

export async function loansForLender(client: any, ownerId: string, lender: unknown) {
  const key = lenderKey(lender);
  if (!key) return [];
  const loans = await listRows(client, 'loans', {
    ownerId,
    order: { column: 'created_at', ascending: false },
    limit: 200,
  });
  return loans.filter((loan) => lenderKey(loan.lender) === key);
}

export async function applyLoanDraw(client: any, ownerId: string,
  { lender, amount, date, note }: { lender: unknown; amount: unknown; date: unknown; note?: unknown }) {
  const value = Number(amount) || 0;
  const name = String(lender || '').trim();
  if (!name || value <= 0) return null;

  const existing = await loansForLender(client, ownerId, name);
  const active = existing
    .filter((loan) => loan.status === 'active' && !isTradeDebtRecord(loan))
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0];

  if (active) {
    await updateRow(client, 'loans', active.id, {
      principal: (Number(active.principal) || 0) + value,
      balance: (Number(active.balance) || 0) + value,
    });
    return { loanId: active.id, created: false };
  }

  const created = await insertRow(client, 'loans', {
    owner_id: ownerId,
    lender: name,
    debt_type: 'cash_loan',
    principal: value,
    balance: value,
    interest_rate: 0,
    installment_amount: value,
    next_payment_date: date,
    frequency: 'one_time',
    status: 'active',
    description: String(note || '') || `Drawn ${date}`,
  });
  return { loanId: created.id, created: true };
}

export async function applyPrincipalRepayment(client: any, ownerId: string,
  { lender, amount, preferredLoanId }: { lender: unknown; amount: unknown; preferredLoanId?: unknown }) {
  const value = Number(amount) || 0;
  if (value <= 0) return { applied: 0, exceeded: 0, loanIds: [] as string[] };

  const active = (await loansForLender(client, ownerId, lender)).filter((loan) => loan.status === 'active');
  active.sort((a, b) => {
    if (preferredLoanId) {
      if (a.id === preferredLoanId) return -1;
      if (b.id === preferredLoanId) return 1;
    }
    return String(a.created_at).localeCompare(String(b.created_at));
  });

  let remaining = value;
  let applied = 0;
  const loanIds: string[] = [];

  for (const loan of active) {
    if (remaining <= 0) break;
    const balance = Number(loan.balance) || 0;
    if (balance <= 0) continue;
    const take = Math.min(balance, remaining);
    const left = balance - take;
    await updateRow(client, 'loans', loan.id, {
      balance: left,
      ...(left <= 0 ? { status: 'settled' } : {}),
    });
    remaining -= take;
    applied += take;
    loanIds.push(loan.id);
  }

  return { applied, exceeded: Math.max(0, value - applied), loanIds: active.map((loan) => loan.id) };
}

export async function deletionBlockReason(client: any, ownerId: string, transaction: any): Promise<string | null> {
  if (!isLoanDrawTransaction(transaction)) return null;
  const lender = String(transaction.recipient || '').trim();
  if (!lender) return null;
  const records = await listRows(client, 'transactions', {
    ownerId,
    order: { column: 'transaction_date', ascending: false },
    limit: 500,
  });
  const repayments = records.filter((record) => lenderKey(record.recipient) === lenderKey(lender)
    && (isLoanPrincipalTransaction(record) || isLoanInterestTransaction(record)
      || String(record.category || '').trim().toLowerCase() === 'loan repayment'));
  if (repayments.length === 0) return null;
  return `This draw already has ${repayments.length} repayment${repayments.length === 1 ? '' : 's'} against ${lender}. Remove those first, or the loan balance would stop matching the ledger.`;
}
