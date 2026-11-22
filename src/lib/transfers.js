import { ledgerDateKey } from './ledgerDates';

/**
 * Money moving between Shawn's own pockets is a transfer, never spending.
 * Spending is consumption only: food, transport, household, tokens, airtime,
 * grooming, charity, health, Whiskers and loan repayments.
 */
export const CONSUMPTION_TYPES = ['sent', 'payment', 'withdrawal', 'airtime', 'credit_purchase'];
export const INCOME_TYPES = ['received', 'deposit'];
export const CREDIT_PURCHASE_TYPE = 'credit_purchase';
export const LADDER_PREFIX = 'Ladder: ';

/**
 * The loan rules apply only from this Nairobi date forward. Anything dated
 * earlier keeps its original treatment and is never reclassified.
 */
export const LOAN_RULES_CUTOVER = '2026-11-19';
export const LOAN_DRAW_TYPE = 'loan';
export const ADJUSTMENT_TYPE = 'adjustment';
export const LOAN_PRINCIPAL_CATEGORY = 'loan principal';
export const LOAN_INTEREST_CATEGORY = 'loan interest';

function categoryKey(transaction) {
  return (transaction?.category || '').trim().toLowerCase();
}

/** True when a record is dated on or after the cutover, Nairobi calendar. */
export function isPostCutover(transaction) {
  const key = ledgerDateKey(transaction?.transaction_date);
  return !!key && key >= LOAN_RULES_CUTOVER;
}

/** A loan disbursement: cash in, never income, never spending. */
export function isLoanDraw(transaction) {
  return !!transaction && transaction.type === LOAN_DRAW_TYPE && isPostCutover(transaction);
}

/** The principal part of a repayment: cash out, but never spending. */
export function isLoanPrincipal(transaction) {
  return !!transaction && categoryKey(transaction) === LOAN_PRINCIPAL_CATEGORY && isPostCutover(transaction);
}

/** A record filed under a Ladder rung, whatever type it was saved with. */
export function isLadderTransfer(transaction) {
  return (transaction?.category || '').trim().toLowerCase().startsWith('ladder:');
}

export function isTransfer(transaction) {
  return !!transaction && (transaction.type === 'transfer' || isLadderTransfer(transaction));
}

/**
 * True only for money actually consumed. Transfers are never spending, and from
 * the cutover a loan draw or a loan principal repayment is never spending either.
 */
export function isConsumption(transaction) {
  if (!transaction) return false;
  if (isPostCutover(transaction)
    && (transaction.type === LOAN_DRAW_TYPE || categoryKey(transaction) === LOAN_PRINCIPAL_CATEGORY)) {
    return false;
  }
  return CONSUMPTION_TYPES.includes(transaction.type) && !isTransfer(transaction);
}

/** Goods or services received on credit: spending in full, but no cash ever moved. */
export function isCreditPurchase(transaction) {
  return !!transaction && transaction.type === CREDIT_PURCHASE_TYPE;
}

/** Spending that actually left the Wallet. A credit purchase never did. */
export function isCashSpending(transaction) {
  return isConsumption(transaction) && !isCreditPurchase(transaction);
}

export function isIncome(transaction) {
  return !!transaction && INCOME_TYPES.includes(transaction.type);
}

/** A reconciliation correction: never income, never spending, only a Wallet fix. */
export function isAdjustment(transaction) {
  return !!transaction && transaction.type === ADJUSTMENT_TYPE;
}

export function sumAmount(items = []) {
  return items.reduce((total, item) => total + (item.amount || 0), 0);
}

export function consumptionOf(transactions = []) {
  return transactions.filter(isConsumption);
}

export function transfersOf(transactions = []) {
  return transactions.filter(isTransfer);
}

/** Where the money went: the rung name for a Ladder line, else the category. */
export function transferDestination(transaction) {
  const category = (transaction?.category || '').trim();
  if (isLadderTransfer(transaction)) {
    return category.slice(category.toLowerCase().indexOf('ladder:') + LADDER_PREFIX.length).trim()
      || transaction.recipient
      || 'Ladder';
  }
  return category || transaction?.recipient || 'Savings';
}