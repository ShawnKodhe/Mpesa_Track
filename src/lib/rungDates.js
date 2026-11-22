import { isBufferRung } from './ladderBuffer';
import { todayISO } from './ladder';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = 86400000;

function clean(iso) {
  return iso ? String(iso).slice(0, 10) : null;
}

function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** "1 Nov 2026" — short month, no time component. */
export function shortDate(iso) {
  const value = clean(iso);
  if (!value) return null;
  const [y, m, d] = value.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

/**
 * The five buffer checkpoints are one climb, so they all begin on the buffer's
 * own start date: the earliest start recorded across those checkpoints.
 */
export function bufferStartDate(rungs = []) {
  const starts = rungs
    .filter((rung) => isBufferRung(rung) && rung.start_date)
    .map((rung) => clean(rung.start_date))
    .sort();
  return starts[0] || null;
}

/** The rung's own start date, or the shared buffer start for a buffer checkpoint. */
export function rungStartDate(rung, rungs = []) {
  if (isBufferRung(rung)) return bufferStartDate(rungs) || clean(rung.start_date);
  return clean(rung.start_date);
}

/** "Starts 1 Nov 2026 · Target 30 Nov 2026" — only the parts that exist. */
export function dateLine(rung, rungs = []) {
  const start = rungStartDate(rung, rungs);
  const target = clean(rung.target_date);
  const parts = [];
  if (start) parts.push(`Starts ${shortDate(start)}`);
  if (target) parts.push(`Target ${shortDate(target)}`);
  return parts.join(' · ');
}

/** "Nov 2026" for the roadmap label. */
export function startMonthYear(rung, rungs = []) {
  const start = rungStartDate(rung, rungs);
  if (!start) return '';
  const [y, m] = start.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

function spanWords(ms) {
  const days = Math.round(ms / DAY);
  if (days <= 1) return '1 day';
  if (days < 45) return `${days} days`;
  return `${Math.round(days / 30.44)} months`;
}

/**
 * Factual pace line for the active rung: time left before it begins, or how far
 * through its own start-to-target window the calendar has moved.
 */
export function paceLine(rung, rungs = [], today = todayISO()) {
  const start = rungStartDate(rung, rungs);
  if (!start) return null;
  const now = parseISO(today);
  const from = parseISO(start);
  if (now < from) return `Starts in ${spanWords(from - now)}`;

  const target = clean(rung.target_date);
  if (!target) return null;
  const to = parseISO(target);
  if (to < from) return null;

  const totalMonths = Math.max(1, Math.round((to - from) / (DAY * 30.44)));
  const monthsIn = Math.floor((now - from) / (DAY * 30.44)) + 1;
  return `Month ${Math.min(monthsIn, totalMonths)} of ${totalMonths}`;
}