import { computeCeiling } from './budgetCeiling';
import {
  isCashSpending, isConsumption, isIncome, isLoanDraw, isTransfer, sumAmount, transferDestination,
} from './transfers';
import { ledgerDateKey, ledgerTodayKey } from './ledgerDates';

/** The Nairobi calendar month a stored date belongs to. */
export function monthKeyOf(value) {
  const key = ledgerDateKey(value);
  return key ? key.slice(0, 7) : '';
}

export function isThisMonth(transaction, now = new Date()) {
  const key = ledgerDateKey(transaction?.transaction_date);
  return !!key && key.slice(0, 7) === ledgerTodayKey(now).slice(0, 7);
}

/**
 * The three figures the month is read by, never netted into one number:
 * allocated is the plan, spent is consumption, moved is what was kept.
 */
export function summarizeMonth({ transactions = [], budgets = [], rungs = [], now = new Date() }) {
  const month = transactions.filter((transaction) => isThisMonth(transaction, now));
  const spent = sumAmount(month.filter(isConsumption));
  // Credit purchases count as spending but never left the Wallet.
  const spentCash = sumAmount(month.filter(isCashSpending));
  const transfers = month.filter(isTransfer);
  const moved = sumAmount(transfers);
  const received = sumAmount(month.filter(isIncome));
  const draws = sumAmount(month.filter(isLoanDraw));

  const byDestination = {};
  transfers.forEach((transaction) => {
    const name = transferDestination(transaction);
    byDestination[name] = (byDestination[name] || 0) + (transaction.amount || 0);
  });
  const movedLines = Object.entries(byDestination)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const ceiling = computeCeiling(budgets, rungs);

  return {
    allocated: ceiling.total,
    spent,
    moved,
    movedLines,
    received,
    draws,
    cashLeft: received + draws - spentCash - moved,
    ceiling,
  };
}