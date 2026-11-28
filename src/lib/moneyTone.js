import { isAdjustment, isCreditPurchase, isLoanDraw, isTransfer, isIncome } from './transfers';

/**
 * One rule for every amount in the app:
 *   in    — money received (green)
 *   out   — money consumed or paid out (red)
 *   moved — money kept, moved to reserves (teal, never spending, never income)
 */
export const MONEY_TONE = {
  in: 'text-money-in',
  out: 'text-money-out',
  moved: 'text-money-moved',
  neutral: 'text-foreground',
};

export function directionOf(transaction) {
  if (!transaction) return 'out';
  if (isAdjustment(transaction)) return (transaction.amount || 0) < 0 ? 'out' : 'in';
  if (isTransfer(transaction)) return 'moved';
  // Goods on credit are spending, but no cash moved either way.
  if (isCreditPurchase(transaction)) return 'neutral';
  if (isLoanDraw(transaction) || isIncome(transaction)) return 'in';
  return 'out';
}

export function signOf(direction) {
  if (direction === 'in') return '+';
  if (direction === 'out') return '-';
  return '';
}