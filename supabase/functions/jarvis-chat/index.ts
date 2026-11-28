import { corsHeaders, handleError, json, listRows, requireUser } from '../_shared/mod.ts';
import { completeJson } from '../_shared/ai.ts';
import { ledgerDateKey, ledgerTodayKey, money } from '../_shared/ledger.ts';
import { sanitizeAction } from '../_shared/actions.ts';

const dayKey = (value: unknown) => String(value || '').slice(0, 10);

async function ledgerSnapshot(client: any, userId: string) {
  const [transactionRows, budgets, loans, receivables, rungs, contributions, snapshots] = await Promise.all([
    listRows(client, 'transactions', {
      ownerId: userId,
      order: { column: 'transaction_date', ascending: false },
      limit: 80,
    }),
    listRows(client, 'budgets', { ownerId: userId, eq: { active: true }, limit: 100 }),
    listRows(client, 'loans', { ownerId: userId, order: { column: 'created_at', ascending: false }, limit: 60 }),
    listRows(client, 'debts_owed', { ownerId: userId, order: { column: 'created_at', ascending: false }, limit: 60 }),
    listRows(client, 'ladder_rungs', { ownerId: userId, order: { column: 'order', ascending: true }, limit: 60 }),
    listRows(client, 'ladder_contributions', {
      ownerId: userId,
      order: { column: 'contribution_date', ascending: false },
      limit: 40,
    }),
    listRows(client, 'wallet_snapshots', {
      ownerId: userId,
      order: { column: 'snapshot_date', ascending: false },
      limit: 3,
    }),
  ]);

  // Only the fields the model can use go into the prompt; smaller input means
  // a faster answer and less noise for the LLM to wade through.
  const transactions = transactionRows.map(compactTransaction);

  const thisMonth = ledgerTodayKey().slice(0, 7);
  const spendByCategory: Record<string, number> = {};
  for (const t of transactions) {
    if (dayKey(t.date).slice(0, 7) !== thisMonth) continue;
    if (!['sent', 'payment', 'withdrawal', 'airtime', 'credit_purchase'].includes(t.type)) continue;
    const category = String(t.category || 'other');
    spendByCategory[category] = (spendByCategory[category] || 0) + (Number(t.amount) || 0);
  }

  return {
    transactions,
    budgets: budgets.map((b) => ({
      ...b,
      spent_this_month: Math.round(spendByCategory[String(b.category)] || 0),
    })),
    loans,
    receivables,
    rungs,
    contributions,
    snapshots,
  };
}

function compactTransaction(t: any) {
  return {
    id: t.id,
    date: ledgerDateKey(t.transaction_date) || dayKey(t.transaction_date),
    type: t.type,
    amount: Number(t.amount) || 0,
    recipient: t.recipient || '',
    category: t.category || '',
    description: t.description || '',
    warning: t.warning || '',
    mpesa_ref: t.mpesa_ref || '',
  };
}

function buildPrompt({ message, history, name, snapshot, today, voiceId }: any) {
  const persona = String(voiceId || '') === 'pFZP5JQG7iQjIQuC4Bku'
    ? `The user has selected Lily's voice: keep her clipped, bored, faintly condescending wit. Do not write spoken tics such as "Mm", "hmm", scoffs, sighs, pauses or breath sounds. The disdain is theatrical; never insult the user or distort a figure.`
    : `The user has selected Charlie's voice: keep the deadpan, dry-humour butler tone. Do not write spoken tics such as "Mm", "hmm", scoffs, sighs, pauses or breath sounds.`;

  return `You are Jarvis, a personal finance assistant for the MpesaTrack app with a dry, sarcastic, quietly dark sense of humour — a competent butler who has read the user's bank statement and is not impressed. Address the user as "sir" occasionally, with deadpan irony, but never overdo it. Use understatement and wit; dark humour is fine about the situation, never about the user as a person. Sound like a person sitting across the desk, not a report: short, conversational, with the odd aside or rhetorical question. Contractions are fine. Never let a joke obscure or distort a financial fact. Speak in the same language the user uses (English or Kiswahili). Keep replies short — usually one or two sentences — and never invent a figure that is not in the ledger snapshot below. When you quote an amount, write it as KES with thousands separators.

${persona}

You have two jobs:
1. Answer questions about the user's real ledger using only the snapshot.
2. When the user clearly asks you to record, change, or remove something, propose a concrete action for them to confirm. Never claim the change happened — say it is ready for confirmation. Do not propose an action for a question. Deletion requires an explicit request.

Action types and the payload fields they accept:
- create_transaction: type, amount, recipient, category, description, transaction_date (YYYY-MM-DD), mpesa_ref
- update_transaction: id, plus any of the fields above
- delete_transaction: id
- create_budget: category, amount, period (weekly|monthly), is_necessity
- update_budget: id, plus any of those fields
- move_to_reserves: amount, transaction_date, recipient, rung_id, category, description
- create_contribution: rung_id, amount, contribution_date, source, note
- create_loan: lender, principal, debt_type (cash_loan|trade_debt), interest_rate, installment_amount, frequency, next_payment_date, description
- update_loan: id, plus any of those fields
- create_receivable: debtor, original_amount, due_date, description
- update_receivable: id, plus any of those fields

Use an id from the snapshot when the user refers to a specific row. Loan principal repayments are transactions of type "payment" with category "loan principal". Money moved into reserves (also called savings) is ALWAYS one "move_to_reserves" action with the amount and transaction_date; set recipient or rung_id only when the user names a destination. That single action creates the Wallet transfer and credits the Ladder balance together. Do NOT use create_transaction, create_contribution or update_transaction for money going into reserves, and never propose a second action for the same move. If the user is describing money they already received, leave that income row alone and record a new move for the amount they put aside. Money taken out of reserves is a "withdrawal" instead. A loan draw is type "loan". Today in Nairobi is ${today}.

Ledger snapshot for ${name || 'the user'}:
${JSON.stringify(snapshot, null, 2)}

Recent conversation:
${JSON.stringify(history || [])}

User says: ${message}

Reply with JSON only: {"reply": "...", "proposed_actions": [{"type": "...", "payload": {...}, "summary": "..."}]}. If no action is needed, proposed_actions must be an empty array.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if (auth.response) return auth.response;
    const { user, client } = auth;

    const body = await req.json().catch(() => ({}));
    const message = String(body?.message || '').trim();
    if (!message) return json({ error: 'A message is required' }, 400);

    const startedAt = Date.now();
    const today = ledgerTodayKey();
    const snapshot = await ledgerSnapshot(client, user.id);
    console.log('jarvisChat ledger snapshot in', Date.now() - startedAt, 'ms');
    const [{ data: profile }] = await Promise.all([
      client.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    ]);

    let result: any;
    const llmStarted = Date.now();
    try {
      result = await completeJson({
        prompt: buildPrompt({
          message,
          history: Array.isArray(body.history) ? body.history.slice(-8) : [],
          name: profile?.full_name,
          snapshot,
          today,
          voiceId: body.voiceId,
        }),
      });
    } catch (error) {
      console.error('jarvisChat Base44 LLM error after', Date.now() - llmStarted, 'ms:', error);
      return json({
        reply: 'The ledger has gone quiet, sir. Magnificent. Try that again.',
        proposed_actions: [],
        recent_transaction: null,
      });
    }
    console.log('jarvisChat LLM reply in', Date.now() - llmStarted, 'ms');

    const actions = (Array.isArray(result?.proposed_actions) ? result.proposed_actions : [])
      .map((action: any) => sanitizeAction(action, today))
      .filter(Boolean)
      .slice(0, 5)
      .map((action: any) => ({ ...action, status: 'pending', receipt: '' }));

    const reply = String(result?.reply || '').trim()
      || 'I have nothing on that, sir.';

    return json({
      reply,
      proposed_actions: actions,
      recent_transaction: snapshot.transactions[0] ? compactTransaction(snapshot.transactions[0]) : null,
    });
  } catch (error) {
    return handleError(error);
  }
});
