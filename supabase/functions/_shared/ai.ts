/** Base44 LLM JSON helper used by the Jarvis and M-Pesa import functions. */

/**
 * Supabase Edge Functions cannot hold a Base44 service-role session, so they
 * call a private Base44 backend function which owns the AI Gateway connection.
 * The shared secret keeps that proxy private; the proxy chooses the model.
 */
export async function completeJson({ prompt }: { prompt: string }): Promise<any> {
  const url = Deno.env.get('BASE44_LLM_FUNCTION_URL');
  if (!url) throw new Error('BASE44_LLM_FUNCTION_URL is not configured for this project');
  const secret = Deno.env.get('BASE44_LLM_SECRET');
  if (!secret) throw new Error('BASE44_LLM_SECRET is not configured for this project');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ prompt }),
    signal: AbortSignal.timeout(60000),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `Base44 LLM request failed (${response.status})`);
  }
  if (!payload?.result || typeof payload.result !== 'object' || Array.isArray(payload.result)) {
    throw new Error('Base44 LLM returned an invalid response');
  }
  return payload.result;
}
