import { isConsumption } from './transfers';
import { inLedgerRange, ledgerTodayKey, startOfMonthKey, startOfWeekKey } from './ledgerDates';

/**
 * Start of a budget period on the Nairobi calendar ('YYYY-MM-DD').
 */
export function getPeriodStart(period, now = new Date()) {
  const today = ledgerTodayKey(now);
  if (period === 'weekly') return startOfWeekKey(today, 0); // 0 = Sunday
  return startOfMonthKey(today);
}

/**
 * Sums consumption transactions for a given category within the budget's
 * period, comparing Nairobi calendar dates.
 */
export function getSpentForBudget(budget, transactions, now = new Date()) {
  const range = {
    start: getPeriodStart(budget.period || 'monthly', now),
    end: ledgerTodayKey(now),
  };
  return transactions
    .filter(t =>
      t.category === budget.category &&
      isConsumption(t) &&
      inLedgerRange(t.transaction_date, range)
    )
    .reduce((s, t) => s + (t.amount || 0), 0);
}

/**
 * The money moved into a budget line in its period. Only transfers count, so a
 * Ladder line shows its funding without any of it being read as spending.
 */
export function getMovedForBudget(budget, transactions, now = new Date()) {
  const range = {
    start: getPeriodStart(budget.period || 'monthly', now),
    end: ledgerTodayKey(now),
  };
  return transactions
    .filter(t =>
      t.category === budget.category &&
      t.type === 'transfer' &&
      inLedgerRange(t.transaction_date, range)
    )
    .reduce((s, t) => s + (t.amount || 0), 0);
}

/**
 * Returns smart alert objects for all budgets.
 * Alert levels: 'over', 'warning' (>=80%), 'halfway' (>=50%)
 */
export function getBudgetAlerts(budgets, transactions) {
  const alerts = [];
  budgets.filter(b => b.active !== false).forEach(b => {
    const spent = getSpentForBudget(b, transactions);
    const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    const label = CATEGORY_LABELS[b.category] || b.category;
    const remaining = b.amount - spent;

    if (pct > 100) {
      alerts.push({
        id: b.id,
        level: 'over',
        category: b.category,
        label,
        message: `Over budget by KES ${Math.abs(remaining).toLocaleString()}`,
        detail: `You've spent KES ${spent.toLocaleString()} against a KES ${b.amount.toLocaleString()} ${b.period || 'monthly'} budget.`,
        is_necessity: b.is_necessity,
      });
    } else if (pct >= 80) {
      alerts.push({
        id: b.id,
        level: 'warning',
        category: b.category,
        label,
        message: `${Math.round(pct)}% used — only KES ${remaining.toLocaleString()} left`,
        detail: `You're close to your ${b.period || 'monthly'} ${label} budget limit.`,
        is_necessity: b.is_necessity,
      });
    } else if (pct >= 50) {
      alerts.push({
        id: b.id,
        level: 'halfway',
        category: b.category,
        label,
        message: `${Math.round(pct)}% used — KES ${remaining.toLocaleString()} remaining`,
        detail: `You're halfway through your ${b.period || 'monthly'} ${label} budget.`,
        is_necessity: b.is_necessity,
      });
    }
  });

  // Sort: over > warning > halfway
  const order = { over: 0, warning: 1, halfway: 2 };
  return alerts.sort((a, b) => order[a.level] - order[b.level]);
}

export const CATEGORY_LABELS = {
  food: 'Food & Groceries',
  transport: 'Transport',
  utilities: 'Utilities',
  rent: 'Rent',
  entertainment: 'Entertainment',
  health: 'Health',
  education: 'Education',
  savings: 'Savings',
  airtime: 'Airtime',
  shopping: 'Shopping',
  family: 'Family',
  business: 'Business',
  other: 'Other',
};