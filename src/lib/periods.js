import { entriesInRange, ledgerRange } from './ledgerDates';
import { sumAmount } from './transfers';

/**
 * The one period list the Analytics cards share. Spending and Received both
 * build their figures from this, so the two always use the same boundaries.
 */
export const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'year', label: 'This Year' },
];

export function periodTotals(records = [], now = new Date()) {
  return PERIODS.map((period) => {
    const range = ledgerRange(period.value, { now });
    const entries = entriesInRange(records, range);
    return { ...period, range, entries, count: entries.length, amount: sumAmount(entries) };
  });
}