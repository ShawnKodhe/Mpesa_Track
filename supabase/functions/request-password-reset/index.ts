import { corsHeaders, handleError, json, serviceClient } from '../_shared/mod.ts';
import { sendEmail } from '../_shared/email.ts';
import { passwordResetHtml } from '../_shared/theme-email.ts';
import { allowRequest, appUrl, findUserByEmail, isValidEmail, normalizeEmail } from '../_shared/recovery.ts';

/**
 * Public forgot-password endpoint. Supabase generates the one-time recovery
 * token but sends no email; Resend delivers the themed message instead.
 * Always answers the same way so callers cannot enumerate accounts.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    if (!isValidEmail(email)) return json({ ok: true });

    const client = serviceClient();
    if (!(await allowRequest(client, email, 'reset'))) {
      console.warn('Password reset request rate-limited for', email);
      return json({ ok: true });
    }

    const found = await findUserByEmail(client, email);
    if (!found?.email) {
      console.info('Password reset requested for an address with no account');
      return json({ ok: true });
    }

    const { data, error } = await client.auth.admin.generateLink({
      type: 'recovery',
      email: found.email,
      options: { redirectTo: `${appUrl()}/reset-password` },
    });
    if (error) throw error;

    const hashedToken = (data as any)?.properties?.hashed_token || (data as any)?.hashed_token;
    if (!hashedToken) throw new Error('Supabase did not return a recovery token');

    const resetUrl = `${appUrl()}/reset-password?token_hash=${encodeURIComponent(hashedToken)}`;
    const firstName = String(found.full_name || '').trim();
    const sent = await sendEmail({
      to: email,
      subject: 'Reset your MpesaTrack password',
      html: passwordResetHtml({ firstName, resetUrl, destination: email }),
    });
    if (!sent) console.error('Password reset email was not delivered to', email);

    return json({ ok: true });
  } catch (error) {
    console.error('request-password-reset failed:', error);
    return handleError(error);
  }
});
