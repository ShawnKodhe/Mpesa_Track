import { liquidityOf } from './liquidity';

/** The five checkpoints that are really one buffer pot measured at five depths. */
export const BUFFER_ORDERS = [1, 3, 4, 5, 6];

export function isBufferRung(rung) {
  return BUFFER_ORDERS.includes(Number(rung?.order));
}

export function bufferRungsOf(rungs) {
  return rungs
    .filter(isBufferRung)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * The single buffer balance: every contribution logged against any of the five
 * checkpoints. Never the sum of the five rungs' stored current_amount values.
 */
export function sharedBufferBalance(contributions, rungs) {
  const ids = new Set(bufferRungsOf(rungs).map((rung) => rung.id));
  return contributions.reduce(
    (sum, contribution) => (ids.has(contribution.rung_id) ? sum + (contribution.amount || 0) : sum),
    0,
  );
}

/** The whole buffer history, newest first, whatever checkpoint it was logged against. */
export function bufferHistory(contributions, rungs) {
  const ids = new Set(bufferRungsOf(rungs).map((rung) => rung.id));
  return contributions
    .filter((contribution) => ids.has(contribution.rung_id))
    .sort((a, b) => (b.contribution_date || '').localeCompare(a.contribution_date || ''));
}

export function bufferStatusFor(rung, shared, nextOrder) {
  if (shared >= (rung.target_amount || 0)) return 'complete';
  return Number(rung.order) === nextOrder ? 'active' : 'locked';
}

/**
 * Rungs as they really stand: the five buffer checkpoints all read the one
 * shared balance, so passing a checkpoint passes every checkpoint behind it.
 * Orders 2, 7, 8, 9, 10, 11 and 12 keep their own independent balances.
 */
export function withSharedBuffer(rungs, contributions) {
  const buffers = bufferRungsOf(rungs);
  if (buffers.length === 0) return rungs;
  const shared = sharedBufferBalance(contributions, rungs);
  const next = buffers.find((rung) => shared < (rung.target_amount || 0));
  const nextOrder = next ? Number(next.order) : null;

  return rungs.map((rung) => (isBufferRung(rung)
    ? { ...rung, current_amount: shared, status: bufferStatusFor(rung, shared, nextOrder) }
    : rung));
}

/** Saved money counted once: the buffer pot is added a single time. */
export function totalSaved(rungs) {
  let total = 0;
  let bufferCounted = false;
  rungs.forEach((rung) => {
    if (isBufferRung(rung)) {
      if (bufferCounted) return;
      bufferCounted = true;
    }
    total += rung.current_amount || 0;
  });
  return total;
}

export function liquiditySplit(rungs) {
  const split = { liquid: 0, locked: 0, invested: 0 };
  let bufferCounted = false;
  rungs.forEach((rung) => {
    if (isBufferRung(rung)) {
      if (bufferCounted) return;
      bufferCounted = true;
    }
    split[liquidityOf(rung)] += rung.current_amount || 0;
  });
  return split;
}

/** Dates on which money left the buffer, so a same-day contribution can be flagged. */
export function bufferWithdrawalDates(transactions, rungs) {
  const labels = new Set(
    bufferRungsOf(rungs).map((rung) => rung.category_label).filter(Boolean),
  );
  const dates = new Set();
  transactions.forEach((transaction) => {
    if (transaction.type !== 'withdrawal') return;
    if (!labels.has(transaction.category)) return;
    const date = (transaction.transaction_date || '').slice(0, 10);
    if (date) dates.add(date);
  });
  return dates;
}