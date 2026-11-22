import { corsHeaders, handleError, json, requireUser } from '../_shared/mod.ts';
import { evaluateBudgetAlert } from '../_shared/budget-alert.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { response, user } = await requireUser(req);
    if (response) return response;

    const body = await req.json().catch(() => ({}));
    if (!body?.transaction_id) return json({ error: 'transaction_id required' }, 400);

    const result = await evaluateBudgetAlert(String(body.transaction_id), user.id);
    return json(result);
  } catch (error) {
    return handleError(error);
  }
});
