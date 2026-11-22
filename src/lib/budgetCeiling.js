import { todayISO } from './ladder';
import { isBufferRung, bufferRungsOf } from './ladderBuffer';
import { rungLineEligible } from './ladderService';
import { shortDate } from './rungDates';

export const LADDER_PREFIX = 'Ladder: ';

export function isLadderLine(budget) {
  return (budget?.category || '').startsWith(LADDER_PREFIX);
}

export function isMonthlyLine(budget) {
  return (budget?.period || 'monthly') === 'monthly';
}

/**
 * Why a Ladder line is not part of the ceiling. Null means it counts.
 * Mirrors rungLineEligible exactly: the line has to be on, its rung has to be
 * running, its start date has to have arrived, and among the five buffer
 * checkpoints only the first may ever own a live line.
 */
function ladderReason(budget, rung, rungs, today) {
  if (!rung) return 'No matching rung';
  if (isBufferRung(rung)) {
    const first = bufferRungsOf(rungs)[0];
    if (!first || Number(first.order) !== Number(rung.order)) return 'Shares the buffer balance';
  }
  if (budget.active === false) return 'Switched off';
  if (rung.status === 'complete') return 'Rung is complete';
  if (rung.status !== 'active') return 'Rung is locked';
  const start = (rung.start_date || '').slice(0, 10);
  if (!start) return 'No start date';
  if (start > today) return `Starts ${shortDate(start)}`;
  return 'Not a monthly line';
}

/**
 * The monthly ceiling, rebuilt from the Budget records on every call.
 * Nothing is stored or memoised across renders, so a change to any Budget or
 * LadderRung record shows up the moment the screen renders again.
 */
export function computeCeiling(budgets = [], rungs = [], today = todayISO()) {
  const rungByCategory = rungs.reduce((map, rung) => {
    if (rung.category_label) map[rung.category_label] = rung;
    return map;
  }, {});

  const counted = [];
  const notCounted = [];
  const outside = [];

  budgets.forEach((budget) => {
    if (isLadderLine(budget)) {
      const rung = rungByCategory[budget.category] || null;
      const counts = isMonthlyLine(budget) && !!rung && budget.active !== false
        && rungLineEligible(rung, rungs, today);
      if (counts) counted.push({ budget, rung });
      else notCounted.push({ budget, rung, reason: ladderReason(budget, rung, rungs, today) });
      return;
    }
    if (budget.active === false) return;
    if (isMonthlyLine(budget)) counted.push({ budget, rung: null });
    else outside.push({ budget, rung: null });
  });

  notCounted.sort((a, b) => (a.rung?.order ?? 999) - (b.rung?.order ?? 999));

  const sum = (items) => items.reduce((total, item) => total + (item.budget.amount || 0), 0);
  const necessities = counted.filter((item) => item.budget.is_necessity);

  return {
    counted,
    notCounted,
    outside,
    total: sum(counted),
    outsideTotal: sum(outside),
    necessitiesTotal: sum(necessities),
    wantsTotal: sum(counted) - sum(necessities),
  };
}

export function lineLabel({ budget, rung }) {
  return rung?.name || (budget.category || '').replace(LADDER_PREFIX, '');
}