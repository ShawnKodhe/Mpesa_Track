/**
 * The ledger runs on Nairobi time.
 *
 * Transactions are stored with a Nairobi-midnight timestamp, e.g.
 * 2026-11-18T00:00:00+03:00, which is 2026-11-17T21:00:00Z in UTC. So a period
 * boundary must be built from the Nairobi calendar date, never from a UTC
 * start-of-day, and a record must be compared on its Nairobi date, never on a
 * UTC instant.
 */
export const LEDGER_TIME_ZONE = 'Africa/Nairobi';
export const LEDGER_TIME_ZONE_LABEL = 'Nairobi';

const keyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: LEDGER_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const monthFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  month: 'short',
  year: '2-digit',
});

/** 'YYYY-MM-DD' on the Nairobi calendar for a stored date or timestamp. */
export function ledgerDateKey(value) {
  if (!value) return '';
  const text = String(value).trim();
  const carriesZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(text);
  if (!carriesZone) {
    // A plain date (or a naive date-time) already states its own calendar day.
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
  }
  const instant = new Date(text);
  if (Number.isNaN(instant.getTime())) return '';
  return keyFormatter.format(instant);
}

/** Today on the Nairobi calendar, whatever the browser's own time zone. */
export function ledgerTodayKey(now = new Date()) {
  return keyFormatter.format(now);
}

function toUtcDate(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDaysKey(key, days) {
  const date = toUtcDate(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function addMonthsKey(key, months) {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + months, 1)).toISOString().slice(0, 10);
}

/** Week start, Monday by default (0 = Sunday, 1 = Monday). */
export function startOfWeekKey(key, weekStartsOn = 1) {
  const offset = (toUtcDate(key).getUTCDay() - weekStartsOn + 7) % 7;
  return addDaysKey(key, -offset);
}

export function startOfMonthKey(key) {
  return `${key.slice(0, 7)}-01`;
}

/** The last `count` Nairobi month starts, oldest first, ending with this month. */
export function ledgerMonthKeys(count = 6, now = new Date()) {
  const today = ledgerTodayKey(now);
  const keys = [];
  for (let i = count - 1; i >= 0; i--) keys.push(addMonthsKey(today, -i));
  return keys;
}

export function startOfYearKey(key) {
  return `${key.slice(0, 4)}-01-01`;
}

export function formatLedgerDay(key) {
  return key ? dayFormatter.format(toUtcDate(key)) : '';
}

const dayShortFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
});

export function formatLedgerDayShort(key) {
  return key ? dayShortFormatter.format(toUtcDate(key)) : '';
}

export function formatLedgerMonth(key) {
  return key ? monthFormatter.format(toUtcDate(key)) : '';
}

/**
 * An inclusive Nairobi date range. `preset` is one of the period values used by
 * the Analytics cards and the Transactions date filters.
 */
export function ledgerRange(preset, { now = new Date(), from = '', to = '' } = {}) {
  const today = ledgerTodayKey(now);
  switch (preset) {
    case 'today':
      return { start: today, end: today };
    case 'week':
      return { start: startOfWeekKey(today), end: today };
    case 'last7':
      return { start: addDaysKey(today, -6), end: today };
    case 'month':
      return { start: startOfMonthKey(today), end: today };
    case 'year':
      return { start: startOfYearKey(today), end: today };
    case 'custom':
      return { start: from || today, end: to || from || today };
    default:
      return { start: '', end: '' };
  }
}

/** True when a stored date falls on a day inside the range, Nairobi time. */
export function inLedgerRange(value, range) {
  const key = ledgerDateKey(value);
  if (!key) return false;
  if (range?.start && key < range.start) return false;
  if (range?.end && key > range.end) return false;
  return true;
}

export function entriesInRange(items = [], range) {
  return items.filter((item) => inLedgerRange(item?.transaction_date, range));
}

export function sumInRange(items = [], range) {
  return entriesInRange(items, range).reduce((total, item) => total + (item.amount || 0), 0);
}

/** "18 Nov 2026, 00:00 to 23:59 Nairobi" for the range actually used. */
export function describeLedgerRange(range) {
  if (!range?.start || !range?.end) return `All dates, ${LEDGER_TIME_ZONE_LABEL}`;
  if (range.start === range.end) {
    return `${formatLedgerDay(range.start)}, 00:00 to 23:59 ${LEDGER_TIME_ZONE_LABEL}`;
  }
  return `${formatLedgerDay(range.start)}, 00:00 to ${formatLedgerDay(range.end)}, 23:59 ${LEDGER_TIME_ZONE_LABEL}`;
}

export function describeLedgerRangeShort(range) {
  if (!range?.start || !range?.end) return 'All dates';
  if (range.start === range.end) return formatLedgerDay(range.start);
  return `${formatLedgerDay(range.start)} – ${formatLedgerDay(range.end)}`;
}