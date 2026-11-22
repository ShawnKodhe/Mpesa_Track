import { DEFAULT_SETTINGS } from './ladderData';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function toISO(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayISO() {
  return toISO(new Date());
}

export function monthStartISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
}

export function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toISO(d);
}

export function fmtKES(n) {
  return `KES ${Math.round(n || 0).toLocaleString('en-KE')}`;
}

export function fmtShort(n) {
  const v = Math.round(n || 0);
  if (v >= 1000000) return `${(v / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return String(v);
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

export function pctOf(current, target) {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.max(0, ((current || 0) / target) * 100));
}

export function rungPct(rung) {
  return pctOf(rung?.current_amount, rung?.target_amount);
}

export function isRungComplete(rung) {
  return (rung?.target_amount || 0) > 0 && (rung.current_amount || 0) >= rung.target_amount;
}

export function daysUntil(iso) {
  if (!iso) return null;
  const today = new Date(`${todayISO()}T00:00:00`);
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Math.round((target - today) / 86400000);
}

export function projectedCompletion(rung) {
  if (!rung) return null;
  const remaining = Math.max(0, (rung.target_amount || 0) - (rung.current_amount || 0));
  if (remaining <= 0) return todayISO();
  const monthly = rung.monthly_contribution || 0;
  if (monthly <= 0) return null;
  const months = Math.ceil(remaining / monthly);
  const d = new Date(`${todayISO()}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return toISO(d);
}

export function isOnTrack(rung) {
  const projected = projectedCompletion(rung);
  if (!projected || !rung?.target_date) return false;
  return projected <= rung.target_date.slice(0, 10);
}

export function contributionsFor(contributions, rungId) {
  return contributions
    .filter((c) => c.rung_id === rungId)
    .sort((a, b) => (b.contribution_date || '').localeCompare(a.contribution_date || ''));
}

export function contributedSince(contributions, rungId, sinceISO) {
  return contributions
    .filter((c) => c.rung_id === rungId && (c.contribution_date || '').slice(0, 10) >= sinceISO)
    .reduce((sum, c) => sum + (c.amount || 0), 0);
}

export function contributedThisMonth(contributions, rungId) {
  return contributedSince(contributions, rungId, monthStartISO());
}

export function dueNotifications({ rungs, contributions, settings }) {
  const on = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  const out = [];
  const month = todayISO().slice(0, 7);
  const active = rungs.filter((r) => r.status === 'active');

  if (on.monthly_reminder !== false) {
    active.forEach((rung) => {
      const monthly = rung.monthly_contribution || 0;
      if (monthly <= 0) return;
      if (contributedThisMonth(contributions, rung.id) >= monthly) return;
      out.push({
        title: 'Contribution day',
        message: `Add your ${fmtKES(monthly)} for ${rung.name} this month.`,
        rule: 'monthly',
        rung_id: rung.id,
        dedupe_key: `monthly-${rung.id}-${month}`,
        read: false,
      });
    });
  }

  if (on.deadline_alert !== false) {
    rungs.filter((r) => r.status !== 'complete').forEach((rung) => {
      const days = daysUntil(rung.target_date);
      if (days === null || days < 0) return;
      const remaining = (rung.target_amount || 0) - (rung.current_amount || 0);
      if (days <= 3) {
        out.push({
          title: 'Deadline in 3 days',
          message: `${rung.name} is due ${fmtDate(rung.target_date)} and needs ${fmtKES(remaining)} more.`,
          rule: 'deadline',
          rung_id: rung.id,
          dedupe_key: `deadline3-${rung.id}-${rung.target_date}`,
          read: false,
        });
      } else if (days <= 14) {
        out.push({
          title: 'Deadline in 14 days',
          message: `${rung.name} closes on ${fmtDate(rung.target_date)} with ${fmtKES(remaining)} still to go.`,
          rule: 'deadline',
          rung_id: rung.id,
          dedupe_key: `deadline14-${rung.id}-${rung.target_date}`,
          read: false,
        });
      }
    });
  }

  if (on.behind_pace !== false) {
    active.forEach((rung) => {
      const monthly = rung.monthly_contribution || 0;
      if (monthly <= 0) return;
      const last30 = contributedSince(contributions, rung.id, daysAgoISO(30));
      if (last30 >= monthly) return;
      out.push({
        title: 'Behind pace',
        message: `${rung.name} received ${fmtKES(last30)} in the last 30 days against a ${fmtKES(monthly)} monthly plan.`,
        rule: 'behind',
        rung_id: rung.id,
        dedupe_key: `behind-${rung.id}-${month}`,
        read: false,
      });
    });
  }

  if (on.completion_notice !== false) {
    rungs.filter(isRungComplete).forEach((rung) => {
      out.push({
        title: `${rung.name} complete`,
        message: `You reached ${fmtKES(rung.target_amount)} on ${rung.name}. The next rung is unlocked.`,
        rule: 'completion',
        rung_id: rung.id,
        dedupe_key: `complete-${rung.id}`,
        read: false,
      });
    });
  }

  return out;
}