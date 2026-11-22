import { corsHeaders, handleError, json, requireUser, serviceClient } from '../_shared/mod.ts';
import { sendEmail } from '../_shared/email.ts';
import { verifySecondaryEmailHtml } from '../_shared/theme-email.ts';
import { allowRequest, appUrl, hashToken, isValidEmail, normalizeEmail, randomToken } from '../_shared/recovery.ts';

/** Signed-in users add or remove a verified backup address for password resets. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const context = await requireUser(req);
    if (context.response) return context.response;

    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && (!isValidEmail(email) || !emailPattern.test(email))) {
      return json({ error: 'Enter a valid email address' }, 400);
    }
    if (email === normalizeEmail(context.user.email)) {
      return json({ error: 'Your backup email must be different from your sign-in email' }, 400);
    }

    const { user, client } = context;
    const { data: profile } = await client.from('profiles')
      .select('full_name, secondary_email, secondary_email_verified_at, pending_secondary_email')
      .eq('id', user.id)
      .maybeSingle();

    // Empty string removes the backup address and any pending verification.
    if (!email) {
      const { error } = await client.from('profiles').update({
        secondary_email: null,
        secondary_email_verified_at: null,
        pending_secondary_email: null,
        pending_secondary_token_hash: null,
        pending_secondary_expires_at: null,
      }).eq('id', user.id);
      if (error) throw error;
      return json({ ok: true, status: 'removed' });
    }

    if (
      email === normalizeEmail(profile?.secondary_email)
      && profile?.secondary_email_verified_at
    ) {
      return json({ ok: true, status: 'already_verified', email });
    }

    const service = serviceClient();
    if (!(await allowRequest(service, email, 'secondary_verify'))) {
      return json({ error: 'Too many verification emails. Please wait a few minutes and try again.' }, 429);
    }

    const token = randomToken();
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await client.from('profiles').update({
      pending_secondary_email: email,
      pending_secondary_token_hash: tokenHash,
      pending_secondary_expires_at: expiresAt,
    }).eq('id', user.id);
    if (updateError) throw updateError;

    const verifyUrl = `${appUrl()}/verify-secondary-email?token=${encodeURIComponent(token)}`;
    const firstName = String(profile?.full_name || '').trim();
    const sent = await sendEmail({
      to: email,
      subject: 'Confirm your MpesaTrack backup email',
      html: verifySecondaryEmailHtml({ firstName, verifyUrl, email }),
    });

    if (!sent) {
      await client.from('profiles').update({
        pending_secondary_email: null,
        pending_secondary_token_hash: null,
        pending_secondary_expires_at: null,
      }).eq('id', user.id);
      return json({ error: 'We could not send the verification email. Please try again.' }, 502);
    }

    return json({ ok: true, status: 'verification_sent', email });
  } catch (error) {
    return handleError(error);
  }
});
