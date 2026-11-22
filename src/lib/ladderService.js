import { api } from '@/lib/api';
import { DEFAULT_SETTINGS } from './ladderData';
import { dueNotifications, todayISO } from './ladder';
import { isBufferRung, bufferRungsOf, bufferStatusFor } from './ladderBuffer';

/**
 * A Ladder line may only ever start out active while its rung is actually
 * running: the rung is active and its start date has arrived. The five buffer
 * checkpoints are one climb, so only the first one may own a live line.
 */
export function rungLineEligible(rung, rungs = [], today = todayISO()) {
  if (isBufferRung(rung)) {
    const first = bufferRungsOf(rungs)[0];
    if (!first || Number(first.order) !== Number(rung.order)) return false;
  }
  const start = (rung.start_date || '').slice(0, 10);
  return rung.status === 'active' && !!start && start <= today;
}

/**
 * Keeps one monthly Budget line per rung that has a monthly contribution.
 * It may read the active flag but never writes it: switching a line on or off
 * is the user's move on the Budget screen only.
 */
export async function syncBudgetLines(rungs, budgets) {
  const today = todayISO();
  for (const rung of rungs) {
    const monthly = rung.monthly_contribution || 0;
    if (monthly <= 0 || !rung.category_label) continue;
    const existing = budgets.find((b) => b.category === rung.category_label);
    if (!existing) {
      await api.entities.Budget.create({
        category: rung.category_label,
        amount: monthly,
        period: 'monthly',
        active: rungLineEligible(rung, rungs, today),
        is_necessity: rung.type === 'buffer',
      });
    } else if (existing.amount !== monthly) {
      await api.entities.Budget.update(existing.id, { amount: monthly });
    }
    if (rung.linked_budget_category !== rung.category_label) {
      await api.entities.LadderRung.update(rung.id, { linked_budget_category: rung.category_label });
    }
  }
}

export async function ensureSettings(settingsList) {
  if (settingsList.length > 0) return settingsList[0];
  return api.entities.LadderSettings.create({ ...DEFAULT_SETTINGS });
}

export async function addContribution({ rung, amount, date, note, rungs, sharedBalance = 0 }) {
  await api.entities.LadderContribution.create({
    rung_id: rung.id,
    amount,
    contribution_date: date,
    source: 'manual',
    note: note || '',
  });

  // Recorded as a transfer, never as spending: the money is kept, not consumed.
  await api.entities.Transaction.create({
    type: 'transfer',
    amount,
    category: rung.category_label,
    recipient: rung.name,
    description: note ? `${rung.name} — ${note}` : `Ladder contribution: ${rung.name}`,
    transaction_date: date,
  });

  if (isBufferRung(rung)) {
    // One pot measured at five depths: every buffer contribution moves the one
    // shared balance, and a later rung can never draw it back down.
    const shared = sharedBalance + amount;
    const buffers = bufferRungsOf(rungs);
    const nextCheckpoint = buffers.find((buffer) => shared < (buffer.target_amount || 0));
    const nextOrder = nextCheckpoint ? Number(nextCheckpoint.order) : null;
    const updates = buffers
      .map((buffer) => ({ buffer, status: bufferStatusFor(buffer, shared, nextOrder) }))
      .filter(({ buffer, status }) => buffer.current_amount !== shared || buffer.status !== status)
      .map(({ buffer, status }) => ({ id: buffer.id, current_amount: shared, status }));

    if (updates.length > 0) await api.entities.LadderRung.bulkUpdate(updates);

    const complete = shared >= (rung.target_amount || 0);
    if (complete) {
      const nextRung = rungs.find((r) => Number(r.order) === Number(rung.order) + 1);
      if (nextRung && nextRung.status === 'locked') {
        await api.entities.LadderRung.update(nextRung.id, { status: 'active' });
      }
    }

    return { complete, newAmount: shared, shared };
  }

  const newAmount = (rung.current_amount || 0) + amount;
  const complete = newAmount >= (rung.target_amount || 0);
  await api.entities.LadderRung.update(rung.id, {
    current_amount: newAmount,
    ...(complete && rung.status !== 'complete' ? { status: 'complete' } : {}),
  });

  if (complete) {
    const next = rungs.find((r) => r.order === rung.order + 1);
    if (next && next.status === 'locked') {
      await api.entities.LadderRung.update(next.id, { status: 'active' });
    }
  }

  return { complete, newAmount };
}

export async function syncNotifications({ rungs, contributions, settings, existing }) {
  const due = dueNotifications({ rungs, contributions, settings });
  const known = new Set(existing.map((n) => n.dedupe_key));
  const fresh = due.filter((n) => !known.has(n.dedupe_key));
  if (fresh.length > 0) await api.entities.Notification.bulkCreate(fresh);
  return fresh.length;
}