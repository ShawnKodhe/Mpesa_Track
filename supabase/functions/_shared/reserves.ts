/** Shared Ladder/reserve bookkeeping for Jarvis actions. */

import { insertRow, listRows, updateRow } from './mod.ts';

// The five buffer checkpoints are one pot, not five independent balances.
const BUFFER_ORDERS = [1, 3, 4, 5, 6];
const RESERVE_HINT = /\b(reserve|reserves|saving|savings|britam|mmf|m-?shwari)\b|ladder:/i;
const OUT_OF_RESERVE = /\b(?:from|out of)\s+(?:the\s+|my\s+|our\s+)?(?:reserve|reserves|saving|savings|britam|mmf|m-?shwari)\b/i;

export const isBufferRung = (rung: any) => BUFFER_ORDERS.includes(Number(rung?.order));

function destinationText(row: any) {
  return [row?.category, row?.recipient, row?.description, row?.note]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value))
    .join(' ')
    .toLowerCase();
}

/** True when the wording points money into reserves, whatever the row type. */
export function isReserveDestination(row: any) {
  const text = destinationText(row);
  if (OUT_OF_RESERVE.test(text)) return false;
  return RESERVE_HINT.test(text);
}

/** A transfer into reserves credits a reserve balance; one out of it does not. */
export function isReserveTransfer(row: any) {
  return String(row?.type || '').toLowerCase() === 'transfer' && isReserveDestination(row);
}

export async function rungsForUser(client: any, userId: string) {
  return listRows(client, 'ladder_rungs', {
    ownerId: userId,
    order: { column: 'order', ascending: true },
    limit: 100,
  });
}

/**
 * Resolve where reserve money belongs. An explicit Ladder rung wins; otherwise
 * file it against the live buffer pot, which is the default reserve.
 */
export function pickReserveRung(rungs: any[], source: any = {}) {
  const text = destinationText(source);

  const byCategory = rungs.find((rung) => {
    const label = String(rung.category_label || '').trim().toLowerCase();
    return label.length > 0 && text.includes(label);
  });
  if (byCategory) return byCategory;

  const byName = rungs.find((rung) => {
    const name = String(rung.name || '').trim().toLowerCase();
    return name.length > 2 && text.includes(name);
  });
  if (byName) return byName;

  const active = rungs.filter((rung) => rung.status === 'active');
  return active.find(isBufferRung)
    || active.find((rung) => String(rung.type || '').toLowerCase() !== 'debt')
    || active[0]
    || rungs.find(isBufferRung)
    || rungs[0]
    || null;
}

async function unlockNext(client: any, rungs: any[], rung: any) {
  const nextOrder = Number(rung.order) + 1;
  const next = rungs.find((candidate) => Number(candidate.order) === nextOrder);
  if (next && next.status === 'locked') {
    await updateRow(client, 'ladder_rungs', next.id, { status: 'active' });
  }
}

/**
 * Record the contribution and move the reserve balance. Buffer checkpoints all
 * read the one shared pot; other rungs keep their own running total.
 */
export async function applyReserveContribution(
  client: any,
  userId: string,
  { rung, rungs, amount, date, note }: {
    rung: any;
    rungs: any[];
    amount: number;
    date: string;
    note: string;
  },
) {
  const contribution = await insertRow(client, 'ladder_contributions', {
    owner_id: userId,
    rung_id: rung.id,
    amount,
    contribution_date: date,
    source: 'manual',
    note: note || '',
  });

  if (isBufferRung(rung)) {
    const buffers = rungs.filter(isBufferRung).sort((a, b) => Number(a.order) - Number(b.order));
    const bufferIds = buffers.map((buffer) => String(buffer.id)).filter(Boolean);
    const history = bufferIds.length > 0
      ? await listRows(client, 'ladder_contributions', {
        ownerId: userId,
        in: { rung_id: bufferIds },
        limit: 1000,
      })
      : [];
    const shared = history.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const nextCheckpoint = buffers.find((buffer) => shared < (Number(buffer.target_amount) || 0));
    const nextOrder = nextCheckpoint ? Number(nextCheckpoint.order) : null;

    for (const buffer of buffers) {
      const target = Number(buffer.target_amount) || 0;
      const status = shared >= target
        ? 'complete'
        : Number(buffer.order) === nextOrder ? 'active' : 'locked';
      if (Number(buffer.current_amount) !== shared || buffer.status !== status) {
        await updateRow(client, 'ladder_rungs', buffer.id, { current_amount: shared, status });
      }
    }

    const complete = shared >= (Number(rung.target_amount) || 0);
    if (complete) await unlockNext(client, rungs, rung);
    return { contribution, rung, newAmount: shared, complete };
  }

  const newAmount = (Number(rung.current_amount) || 0) + amount;
  const complete = newAmount >= (Number(rung.target_amount) || 0);
  await updateRow(client, 'ladder_rungs', rung.id, {
    current_amount: newAmount,
    ...(complete && rung.status !== 'complete' ? { status: 'complete' } : {}),
  });
  if (complete) await unlockNext(client, rungs, rung);
  return { contribution, rung, newAmount, complete };
}
