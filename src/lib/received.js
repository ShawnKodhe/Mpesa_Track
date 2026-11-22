import { isIncome, isLoanDraw, isTransfer, sumAmount } from './transfers';
import {
  addDaysKey,
  addMonthsKey,
  formatLedgerDayShort,
  formatLedgerMonth,
  ledgerDateKey,
  startOfMonthKey,
} from './ledgerDates';

/**
 * Money actually received: a 'received' (or 'deposit') record that is not a
 * savings transfer and not a loan draw. Both Analytics and the Dashboard read
 * money in through this one function, so the two can never disagree.
 */
export function isReceipt(transaction) {
  return isIncome(transaction) && !isTransfer(transaction) && !isLoanDraw(transaction);
}

export function receiptsOf(transactions = []) {
  return transactions.filter(isReceipt);
}

export function loanDrawsOf(transactions = []) {
  return transactions.filter(isLoanDraw);
}

/** Family, Business and Receivables keep a line of their own; the rest is Other. */
export const RECEIVED_GROUPS = [
  { key: 'family', label: 'Family' },
  { key: 'business', label: 'Business' },
  { key: 'receivables', label: 'Receivables' },
  { key: 'other', label: 'Other' },
];

function groupOf(transaction) {
  const category = (transaction?.category || '').trim().toLowerCase();
  if (category === 'family') return 'family';
  if (category === 'business') return 'business';
  if (category.startsWith('receivable')) return 'receivables';
  return 'other';
}

/** One figure per group. A group with nothing in it is left out, never shown as zero. */
export function receivedGroups(receipts = []) {
  const totals = {};
  receipts.forEach((receipt) => {
    const key = groupOf(receipt);
    totals[key] = (totals[key] || 0) + (receipt.amount || 0);
  });
  return RECEIVED_GROUPS
    .map((group) => ({ ...group, amount: totals[group.key] || 0 }))
    .filter((group) => group.amount !== 0);
}

/** Newest first on the Nairobi calendar day of each record. */
export function receiptsNewestFirst(receipts = []) {
  return [...receipts].sort((a, b) => (
    ledgerDateKey(b.transaction_date).localeCompare(ledgerDateKey(a.transaction_date))
  ));
}

function utcDay(key) {
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/**
 * The range cut into buckets for the chart: single days, or whole months once
 * the range runs past two months. Empty buckets stay in as zeros so a quiet
 * period reads as a flat line rather than a missing one.
 */
export function receiptBuckets(receipts = [], range) {
  if (!range?.start || !range?.end) return [];
  const spanDays = Math.round((utcDay(range.end) - utcDay(range.start)) / 86400000) + 1;
  const byMonth = spanDays > 62;

  const totals = {};
  receipts.forEach((receipt) => {
    const key = ledgerDateKey(receipt.transaction_date);
    if (!key) return;
    const bucket = byMonth ? key.slice(0, 7) : key;
    totals[bucket] = (totals[bucket] || 0) + (receipt.amount || 0);
  });

  if (byMonth) {
    const months = [];
    let cursor = startOfMonthKey(range.start);
    const last = startOfMonthKey(range.end);
    while (cursor <= last) {
      months.push(cursor.slice(0, 7));
      cursor = addMonthsKey(cursor, 1);
    }
    return months.map((month) => ({ label: formatLedgerMonth(`${month}-01`), amount: totals[month] || 0 }));
  }

  const days = [];
  let cursor = range.start;
  while (cursor <= range.end) {
    days.push(cursor);
    cursor = addDaysKey(cursor, 1);
  }
  return days.map((day) => ({ label: formatLedgerDayShort(day), amount: totals[day] || 0 }));
}

/** Total, the biggest single receipt, and the average over days that had money in. */
export function receiptSummary(receipts = []) {
  const total = sumAmount(receipts);
  const largest = receipts.reduce((best, receipt) => (
    !best || (receipt.amount || 0) > (best.amount || 0) ? receipt : best
  ), null);
  const days = new Set(receipts.map((receipt) => ledgerDateKey(receipt.transaction_date)).filter(Boolean));

  return {
    total,
    count: receipts.length,
    largest,
    activeDays: days.size,
    averagePerDay: days.size ? total / days.size : 0,
  };
}