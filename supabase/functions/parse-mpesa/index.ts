import { corsHeaders, handleError, json, requireUser } from '../_shared/mod.ts';
import { completeJson } from '../_shared/ai.ts';

const TYPES = ['sent', 'received', 'payment', 'withdrawal', 'deposit', 'airtime', 'transfer'];
const CATEGORIES = [
  'food', 'transport', 'utilities', 'rent', 'entertainment', 'health', 'education',
  'savings', 'airtime', 'shopping', 'family', 'business', 'other',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    const messages = String(body?.messages || '').trim();
    if (!messages) return json({ error: 'Messages are required' }, 400);
    if (messages.length > 20000) return json({ error: 'Too much text to parse at once' }, 400);

    const prompt = `Parse these M-Pesa SMS messages and extract transaction data. For each message, determine:
- type: one of "sent", "received", "payment", "withdrawal", "deposit", "airtime", "transfer". Use "transfer" for money moved into the user's own savings: M-Shwari, Britam MMF, or any Ladder rung.
- amount: the transaction amount in KES (number only)
- recipient: who the money was sent to or received from
- category: best guess from: ${CATEGORIES.join(', ')}. For a transfer into a Ladder rung use the exact rung category, e.g. "Ladder: Buffer floor"
- description: brief description
- transaction_date: date in YYYY-MM-DD format
- mpesa_ref: the M-Pesa confirmation code

Return only one JSON object with a "transactions" array. Ignore promotional or non-transaction messages.

Messages:
${messages}`;

    let result: any;
    try {
      result = await completeJson({ prompt });
    } catch (error) {
      console.error('parseMpesa Base44 LLM error:', error);
      return json({ error: 'Could not parse those messages right now' }, 502);
    }

    const transactions = (Array.isArray(result?.transactions) ? result.transactions : [])
      .map((item: any) => {
        const amount = Number(item?.amount);
        const date = String(item?.transaction_date || '').trim();
        if (!Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
        return {
          type: TYPES.includes(String(item.type || '')) ? item.type : 'sent',
          amount: Math.round(amount * 100) / 100,
          recipient: String(item.recipient || '').slice(0, 160),
          category: CATEGORIES.includes(String(item.category || '')) ? item.category : 'other',
          description: String(item.description || '').slice(0, 500),
          transaction_date: date,
          mpesa_ref: String(item.mpesa_ref || '').slice(0, 80),
        };
      })
      .filter(Boolean);

    return json({ transactions });
  } catch (error) {
    return handleError(error);
  }
});
