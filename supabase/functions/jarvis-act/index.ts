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

const TABLES: Record<string, string> = {
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

async function runAction(client: any, userId: string, action: any) {
  const { type, payload } = action;
  const table = TABLES[type];
  const today = ledgerTodayKey();

  switch (type) {
    case 'create_transaction': {
      const row = await insertRow(client, 'transactions', { ...payload, owner_id: userId });
      let warning = null;
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
      const receipt = `Recorded KES ${money(row.amount)} ${row.type} ${label(row.recipient)}.${warning ? ` ${warning}` : ''}`;
      return { entity: 'Transaction', id: row.id, receipt };
    }

    case 'update_transaction': {
      const { record: before, response } = await loadOwnedRecord(client, 'transactions', payload.id, userId);
      if (response) return { response };
      const row = await updateRow(client, 'transactions', payload.id, payload);
      let warning = null;
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
        receipt: `Updated the ${label(row.category)} transaction of KES ${money(row.amount)}.${warning ? ` ${warning}` : ''}`,
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
      let rungId = String(payload.rung_id || '').trim();
      if (!rungId) {
        const { data: first } = await client.from('ladder_rungs').select('id')
          .eq('owner_id', userId).order('order', { ascending: true }).limit(1);
        rungId = first?.[0]?.id || '';
      }
      if (!rungId) return { response: json({ error: 'No Ladder rung is set up yet' }, 400) };
      const { record: rung, response: rungResponse } = await loadOwnedRecord(client, 'ladder_rungs', rungId, userId);
      if (rungResponse) return { response: rungResponse };

      const row = await insertRow(client, 'ladder_contributions', {
        ...payload,
        rung_id: rung.id,
        contribution_date: payload.contribution_date || today,
        owner_id: userId,
      });
      await updateRow(client, 'ladder_rungs', rung.id, {
        current_amount: (Number(rung.current_amount) || 0) + (Number(row.amount) || 0),
      });
      return {
        entity: 'LadderContribution',
        id: row.id,
        receipt: `KES ${money(row.amount)} added to ${label(rung.name)}.`,
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
