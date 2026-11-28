import {
  corsHeaders, deleteRow, handleError, insertRow, json, requireUser, updateRow,
} from '../_shared/mod.ts';
import { ledgerTodayKey, money } from '../_shared/ledger.ts';
import { sanitizeAction } from '../_shared/actions.ts';
import { loadOwnedRecord } from '../_shared/records.ts';
import {
  applyLoanDraw,
  applyPrincipalRepayment,
  deletionBlockReason,
  isLoanDrawTransaction,
  isLoanPrincipalTransaction,
} from '../_shared/loan-sync.ts';
import { evaluateBudgetAlert } from '../_shared/budget-alert.ts';
import {
  applyReserveContribution, isReserveTransfer, pickReserveRung, rungsForUser,
} from '../_shared/reserves.ts';

const TABLES: Record<string, string> = {
  move_to_reserves: 'transactions',
  create_transaction: 'transactions',
  update_transaction: 'transactions',
  delete_transaction: 'transactions',
  create_budget: 'budgets',
  update_budget: 'budgets',
  create_contribution: 'ladder_contributions',
  create_loan: 'loans',
  update_loan: 'loans',
  create_receivable: 'debts_owed',
  update_receivable: 'debts_owed',
};

const label = (value: unknown) => String(value || '').trim() || 'that record';

/** Credit a reserve transfer into its Ladder rung and file it under that rung. */
async function creditReserveTransfer(
  client: any,
  userId: string,
  row: any,
  today: string,
  preferredRung: any = null,
) {
  const rungs = await rungsForUser(client, userId);
  const rung = preferredRung || pickReserveRung(rungs, row);
  if (!rung) {
    return { warning: 'The transfer is recorded, but no Ladder rung is set up to hold the reserve.', reserve: null };
  }

  const reserve = await applyReserveContribution(client, userId, {
    rung,
    rungs,
    amount: Number(row.amount) || 0,
    date: String(row.transaction_date || today).slice(0, 10),
    note: String(row.description || ''),
  });

  // The money landed in a specific rung, so file the transfer under that rung's
  // budget category. Otherwise the Ladder moves but its Budget line and the
  // "Moved to reserves" breakdown disagree.
  if (rung.category_label && row.id && row.category !== rung.category_label) {
    await updateRow(client, 'transactions', row.id, { category: rung.category_label });
    row.category = rung.category_label;
  }

  return { warning: null, reserve };
}

async function runAction(client: any, userId: string, action: any) {
  const { type, payload } = action;
  const table = TABLES[type];
  const today = ledgerTodayKey();

  switch (type) {
    case 'move_to_reserves': {
      const amount = Number(payload.amount) || 0;
      const date = String(payload.transaction_date || today).slice(0, 10);
      const rungs = await rungsForUser(client, userId);
      const requestedId = String(payload.rung_id || '').trim();
      const rung = requestedId
        ? rungs.find((item) => String(item.id) === requestedId) || null
        : pickReserveRung(rungs, payload);
      if (!rung) return { response: json({ error: 'No Ladder rung is set up yet' }, 400) };

      // One action owns both sides of the move: the Wallet loses the cash and
      // the Ladder gains it. No separate contribution proposal is needed.
      const row = await insertRow(client, 'transactions', {
        owner_id: userId,
        type: 'transfer',
        amount,
        category: rung.category_label || 'reserves',
        recipient: String(payload.recipient || rung.name || 'Reserves'),
        description: String(payload.description || `Transfer to ${rung.name}`),
        transaction_date: date,
      });

      let warning = null;
      let reserve = null;
      try {
        const credited = await creditReserveTransfer(client, userId, row, today, rung);
        warning = credited.warning;
        reserve = credited.reserve;
      } catch (error) {
        console.error('jarvisAct reserve move failed:', error);
        warning = 'The transfer is recorded, but the reserve balance could not be updated.';
      }

      const credited = reserve ? ` KES ${money(amount)} is now in ${label(rung.name)}.` : '';
      return {
        entity: 'Transaction',
        id: row.id,
        receipt: `Recorded KES ${money(amount)} moved to reserves. Wallet reduced and Ladder updated.${credited}${warning ? ` ${warning}` : ''}`,
      };
    }

    case 'create_transaction': {
      const row = await insertRow(client, 'transactions', { ...payload, owner_id: userId });
      let warning = null;
      let reserve = null;

      // A transfer into reserves is kept money, not spending. Credit the Ladder
      // too, otherwise the Wallet drops while the reserve total stays put.
      if (isReserveTransfer(row)) {
        try {
          const credited = await creditReserveTransfer(client, userId, row, today);
          warning = credited.warning;
          reserve = credited.reserve;
        } catch (error) {
          console.error('jarvisAct reserve credit failed:', error);
          warning = 'The transfer is recorded, but the reserve balance could not be updated.';
        }
      }

      if (isLoanDrawTransaction(row)) {
        const draw = await applyLoanDraw(client, userId, {
          lender: row.recipient, amount: row.amount, date: row.transaction_date, note: row.description,
        });
        if (draw) warning = `Loan record ${draw.created ? 'created' : 'updated'} for ${label(row.recipient)}.`;
      } else if (isLoanPrincipalTransaction(row)) {
        const result = await applyPrincipalRepayment(client, userId, { lender: row.recipient, amount: row.amount });
        if (result.exceeded > 0) {
          warning = `Repayment exceeds the balance by KES ${money(result.exceeded)}; balance left at zero.`;
          await updateRow(client, 'transactions', row.id, { warning });
        }
      }
      try { await evaluateBudgetAlert(row.id, userId); } catch { /* never block a write */ }
      const credited = reserve
        ? ` KES ${money(row.amount)} is now in ${label(reserve.rung.name)}.`
        : '';
      const receipt = `Recorded KES ${money(row.amount)} ${row.type} ${label(row.recipient)}.${credited}${warning ? ` ${warning}` : ''}`;
      return { entity: 'Transaction', id: row.id, receipt };
    }

    case 'update_transaction': {
      const { record: before, response } = await loadOwnedRecord(client, 'transactions', payload.id, userId);
      if (response) return { response };
      const row = await updateRow(client, 'transactions', payload.id, payload);
      let warning = null;
      let credited = '';

      // A row turned into a reserve transfer must also move the Ladder balance.
      if (isReserveTransfer(row) && !isReserveTransfer(before)) {
        try {
          const result = await creditReserveTransfer(client, userId, row, today);
          warning = result.warning;
          if (result.reserve) credited = ` KES ${money(row.amount)} is now in ${label(result.reserve.rung.name)}.`;
        } catch (error) {
          console.error('jarvisAct reserve credit failed:', error);
          warning = 'The transfer is recorded, but the reserve balance could not be updated.';
        }
      }

      const amountChanged = Number(before.amount) !== Number(row.amount);
      const recipientChanged = String(before.recipient || '') !== String(row.recipient || '');
      if ((isLoanDrawTransaction(row)) && (amountChanged || recipientChanged)) {
        await applyLoanDraw(client, userId, {
          lender: row.recipient, amount: row.amount, date: row.transaction_date, note: row.description,
        });
        warning = 'The linked loan was updated too.';
      } else if (isLoanPrincipalTransaction(row) && amountChanged) {
        const result = await applyPrincipalRepayment(client, userId, { lender: row.recipient, amount: row.amount });
        if (result.exceeded > 0) warning = `Repayment exceeds the balance by KES ${money(result.exceeded)}.`;
      }
      try { await evaluateBudgetAlert(row.id, userId); } catch { /* never block a write */ }
      return {
        entity: 'Transaction',
        id: row.id,
        receipt: `Updated the ${label(row.category)} transaction of KES ${money(row.amount)}.${credited}${warning ? ` ${warning}` : ''}`,
      };
    }

    case 'delete_transaction': {
      const { record, response } = await loadOwnedRecord(client, 'transactions', payload.id, userId);
      if (response) return { response };
      const reason = await deletionBlockReason(client, userId, record);
      if (reason) return { response: json({ error: reason }, 409) };
      await deleteRow(client, 'transactions', payload.id);
      return { entity: 'Transaction', id: payload.id, receipt: 'Removed that transaction, sir.' };
    }

    case 'create_budget': {
      const row = await insertRow(client, 'budgets', { ...payload, owner_id: userId });
      return {
        entity: 'Budget',
        id: row.id,
        receipt: `Budget set: KES ${money(row.amount)} for ${label(row.category)} each ${row.period}.`,
      };
    }

    case 'update_budget': {
      const row = await updateRow(client, 'budgets', payload.id, payload);
      return {
        entity: 'Budget',
        id: row.id,
        receipt: `Budget for ${label(row.category)} is now KES ${money(row.amount)} per ${row.period}.`,
      };
    }

    case 'create_contribution': {
      const amount = Number(payload.amount) || 0;
      const rungs = await rungsForUser(client, userId);
      const requestedId = String(payload.rung_id || '').trim();
      let rung = null;
      if (requestedId) {
        rung = rungs.find((item) => String(item.id) === requestedId) || null;
        if (!rung) return { response: json({ error: 'That Ladder rung was not found' }, 404) };
      } else {
        rung = pickReserveRung(rungs, payload);
      }
      if (!rung) return { response: json({ error: 'No Ladder rung is set up yet' }, 400) };

      const { contribution } = await applyReserveContribution(client, userId, {
        rung,
        rungs,
        amount,
        date: String(payload.contribution_date || today).slice(0, 10),
        note: String(payload.note || ''),
      });

      // Mirror the Ladder screen: the reserve goes up and the Wallet goes down.
      await insertRow(client, 'transactions', {
        owner_id: userId,
        type: 'transfer',
        amount,
        category: rung.category_label || 'reserves',
        recipient: rung.name || 'Reserves',
        description: contribution.note
          ? `${rung.name} — ${contribution.note}`
          : `Ladder contribution: ${rung.name}`,
        transaction_date: contribution.contribution_date,
      });

      return {
        entity: 'LadderContribution',
        id: contribution.id,
        receipt: `KES ${money(amount)} added to ${label(rung.name)}.`,
      };
    }

    case 'create_loan': {
      const row = await insertRow(client, 'loans', { ...payload, owner_id: userId });
      return {
        entity: 'Loan',
        id: row.id,
        receipt: `Loan from ${label(row.lender)} opened at KES ${money(row.principal)}.`,
      };
    }

    case 'update_loan': {
      const row = await updateRow(client, 'loans', payload.id, payload);
      return {
        entity: 'Loan',
        id: row.id,
        receipt: `The ${label(row.lender)} loan now has a balance of KES ${money(row.balance)}.`,
      };
    }

    case 'create_receivable': {
      const row = await insertRow(client, 'debts_owed', { ...payload, owner_id: userId });
      return {
        entity: 'DebtOwed',
        id: row.id,
        receipt: `Receivable of KES ${money(row.original_amount)} from ${label(row.debtor)} recorded.`,
      };
    }

    case 'update_receivable': {
      const row = await updateRow(client, 'debts_owed', payload.id, payload);
      return {
        entity: 'DebtOwed',
        id: row.id,
        receipt: `${label(row.debtor)} now owes KES ${money(row.balance)}.`,
      };
    }

    default:
      return { response: json({ error: 'That action is not supported' }, 400) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if (auth.response) return auth.response;
    const { user, client } = auth;

    const body = await req.json().catch(() => ({}));
    const action = sanitizeAction(body?.action, ledgerTodayKey());
    if (!action) return json({ error: 'That action is not supported or is missing required details' }, 400);
    if (!TABLES[action.type]) return json({ error: 'That action is not supported' }, 400);

    const result = await runAction(client, user.id, action);
    if (result.response) return result.response;
    return json({ ok: true, ...result });
  } catch (error) {
    return handleError(error);
  }
});
