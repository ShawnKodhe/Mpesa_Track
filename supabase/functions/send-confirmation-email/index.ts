import { corsHeaders, handleError, json, serviceClient } from '../_shared/mod.ts';
import { requireInternal } from '../_shared/internal.ts';
import { sendEmail } from '../_shared/email.ts';
import { confirmationEmailHtml } from '../_shared/theme-email.ts';

/** Queued by the auth.users insert trigger; Supabase Auth sends no email itself. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const guard = requireInternal(req);
  if (guard) return guard;

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const userId = String(body?.user_id || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'A valid email is required' }, 400);
    }
    if (!userId) return json({ error: 'A user id is required' }, 400);

    const client = serviceClient();
    const { data: profile } = await client.from('profiles')
      .select('full_name').eq('id', userId).maybeSingle();
    const fullName = String(profile?.full_name || body?.full_name || '').trim();
    const appUrl = (Deno.env.get('APP_URL') || 'https://mpesatrack.com').replace(/\/$/, '');

    const sent = await sendEmail({
      to: email,
      subject: 'Welcome to MpesaTrack — your account is ready',
      html: confirmationEmailHtml({ firstName: fullName, appUrl }),
    });

    if (!sent) {
      console.error('Confirmation email was not delivered to', email);
      return json({ error: 'Resend did not accept the confirmation email' }, 502);
    }
    return json({ sent: true, email });
  } catch (error) {
    return handleError(error);
  }
});
