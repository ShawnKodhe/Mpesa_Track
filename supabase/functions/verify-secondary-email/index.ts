import { corsHeaders, handleError, json, serviceClient } from '../_shared/mod.ts';
import { hashToken } from '../_shared/recovery.ts';

/** Public one-time token check; promotes the pending address to verified. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || '').trim();
    if (!token) return json({ error: 'A verification token is required' }, 400);

    const client = serviceClient();
    const tokenHash = await hashToken(token);
    const { data: profile, error } = await client.from('profiles')
      .select('id, pending_secondary_email, pending_secondary_token_hash, pending_secondary_expires_at')
      .eq('pending_secondary_token_hash', tokenHash)
      .gt('pending_secondary_expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) throw error;
    if (!profile?.pending_secondary_email) {
      return json({ error: 'This verification link is invalid or has expired.' }, 400);
    }

    const verifiedAt = new Date().toISOString();
    const { error: updateError } = await client.from('profiles').update({
      secondary_email: profile.pending_secondary_email,
      secondary_email_verified_at: verifiedAt,
      pending_secondary_email: null,
      pending_secondary_token_hash: null,
      pending_secondary_expires_at: null,
    }).eq('id', profile.id);
    if (updateError) throw updateError;

    return json({ ok: true, email: profile.pending_secondary_email });
  } catch (error) {
    return handleError(error);
  }
});
