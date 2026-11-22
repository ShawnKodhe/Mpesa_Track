/** Nairobi ledger helpers, mirroring src/lib/ledgerDates.js and transfers.js. */
export const LEDGER_TIME_ZONE = 'Africa/Nairobi';

const keyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: LEDGER_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function ledgerDateKey(value: unknown): string {
  if (!value) return '';
  const text = String(value).trim();
  if (!/(?:z|[+-]\d{2}:?\d{2})$/i.test(text)) {
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
  }
  const instant = new Date(text);
  if (Number.isNaN(instant.getTime())) return '';
  return keyFormatter.format(instant);
}

export function ledgerTodayKey(now = new Date()): string {
  return keyFormatter.format(now);
}

export const CONSUMPTION_TYPES = ['sent', 'payment', 'withdrawal', 'airtime', 'credit_purchase'];
export const INCOME_TYPES = ['received', 'deposit'];
export const LOAN_FREQUENCIES = ['one_time', 'weekly', 'biweekly', 'monthly'];
export const LOAN_RULES_CUTOVER = '2026-11-19';
export const LOAN_DRAW_TYPE = 'loan';
export const LOAN_PRINCIPAL_CATEGORY = 'loan principal';
export const LOAN_INTEREST_CATEGORY = 'loan interest';

const categoryKeyOf = (transaction: any) => String(transaction?.category || '').trim().toLowerCase();

export function isPostCutover(transaction: any): boolean {
  const key = ledgerDateKey(transaction?.transaction_date);
  return !!key && key >= LOAN_RULES_CUTOVER;
}

export function isLoanDrawRecord(transaction: any): boolean {
  return !!transaction && transaction.type === LOAN_DRAW_TYPE && isPostCutover(transaction);
}

export function isLoanPrincipalRecord(transaction: any): boolean {
  return !!transaction && categoryKeyOf(transaction) === LOAN_PRINCIPAL_CATEGORY && isPostCutover(transaction);
}

export function isLadderTransfer(transaction: any): boolean {
  return String(transaction?.category || '').trim().toLowerCase().startsWith('ladder:');
}

export function isTransferRecord(transaction: any): boolean {
  return !!transaction && (transaction.type === 'transfer' || isLadderTransfer(transaction));
}

export function isConsumptionRecord(transaction: any): boolean {
  if (!transaction) return false;
  if (isPostCutover(transaction)
    && (transaction.type === LOAN_DRAW_TYPE || categoryKeyOf(transaction) === LOAN_PRINCIPAL_CATEGORY)) {
    return false;
  }
  return CONSUMPTION_TYPES.includes(transaction.type) && !isTransferRecord(transaction);
}

export function isCreditPurchaseRecord(transaction: any): boolean {
  return !!transaction && transaction.type === 'credit_purchase';
}

export function sumAmount(items: any[] = []): number {
  return items.reduce((total, item) => total + (Number(item?.amount) || 0), 0);
}

export function money(value: unknown): string {
  const rounded = Math.round(Number(value) || 0);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}${String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}
