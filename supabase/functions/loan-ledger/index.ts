import { corsHeaders, handleError, insertRows, json, requireUser, updateRow } from '../_shared/mod.ts';
import { ledgerDateKey, ledgerTodayKey, money } from '../_shared/ledger.ts';
import { clean, isDateKey, loadOwnedRecord, toNumber } from '../_shared/records.ts';
import {
  applyLoanDraw,
  applyPrincipalRepayment,
  deletionBlockReason,
  isLoanDrawTransaction,
  isLoanPrincipalTransaction,
} from '../_shared/loan-sync.ts';
import { evaluateBudgetAlert } from '../_shared/budget-alert.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if (auth.response) return auth.response;
    const { user, client } = auth;

    const body = await req.json().catch(() => ({}));

    switch (body?.action) {
      case 'sync_transaction': {
        const { record, response } = await loadOwnedRecord(client, 'transactions', body.transactionId, user.id);
        if (response) return response;

        if (isLoanDrawTransaction(record)) {
          const draw = await applyLoanDraw(client, user.id, {
            lender: record.recipient,
            amount: record.amount,
            date: ledgerDateKey(record.transaction_date) || ledgerTodayKey(),
            note: record.description,
          });
          return json({ ok: true, loanId: draw?.loanId || null, warning: null });
        }

        if (isLoanPrincipalTransaction(record)) {
          const result = await applyPrincipalRepayment(client, user.id, {
            lender: record.recipient,
            amount: record.amount,
          });
          if (result.exceeded > 0) {
            const warning = `Repayment is ${money(result.exceeded)} more than the outstanding balance. The balance is left at zero.`;
            await updateRow(client, 'transactions', record.id, { warning });
            return json({ ok: true, warning });
          }
        }
        return json({ ok: true, warning: null });
      }

      case 'check_delete': {
        const { record, response } = await loadOwnedRecord(client, 'transactions', body.transactionId, user.id);
        if (response) return response;
        const reason = await deletionBlockReason(client, user.id, record);
        return json({ blocked: !!reason, reason: reason || null });
      }

      case 'record_repayment': {
        const { record: loan, response } = await loadOwnedRecord(client, 'loans', body.loanId, user.id);
        if (response) return response;

        const principal = toNumber(body.principal) ?? 0;
        const interest = toNumber(body.interest) ?? 0;
        if (principal < 0 || interest < 0) return json({ error: 'Amounts cannot be negative' }, 400);
        if (principal <= 0 && interest <= 0) {
          return json({ error: 'A principal or interest amount is required' }, 400);
        }

        const date = isDateKey(body.transactionDate) ? clean(body.transactionDate) : ledgerTodayKey();
        const lender = String(loan.lender || '').trim();
        const note = clean(body.description);
        const records: Record<string, unknown>[] = [];
        if (principal > 0) {
          records.push({
            owner_id: user.id,
            type: 'payment',
            amount: principal,
            category: 'loan principal',
            recipient: lender,
            description: note || 'Loan principal',
            transaction_date: date,
          });
        }
        if (interest > 0) {
          records.push({
            owner_id: user.id,
            type: 'payment',
            amount: interest,
            category: 'loan interest',
            recipient: lender,
            description: note || 'Loan interest and fees',
            transaction_date: date,
          });
        }

        const created = await insertRows(client, 'transactions', records);
        const result = principal > 0
          ? await applyPrincipalRepayment(client, user.id, { lender, amount: principal, preferredLoanId: loan.id })
          : { applied: 0, exceeded: 0, loanIds: [] as string[] };

        let warning: string | null = null;
        if (result.exceeded > 0) {
          warning = `Repayment is ${money(result.exceeded)} more than the outstanding balance. The balance is left at zero.`;
          const principalRecord = created.find((row) => String(row.category || '').toLowerCase() === 'loan principal');
          if (principalRecord) await updateRow(client, 'transactions', principalRecord.id, { warning });
        }
        for (const row of created) {
          try { await evaluateBudgetAlert(row.id, user.id); } catch { /* alerts never block a write */ }
        }
        return json({ ok: true, applied: result.applied, warning });
      }

      default:
        return json({ error: 'Unknown action' }, 400);
    }
  } catch (error) {
    return handleError(error);
  }
});
