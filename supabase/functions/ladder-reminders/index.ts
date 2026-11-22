import { corsHeaders, handleError, json, listRows, requireUser } from '../_shared/mod.ts';

/** Pending Ladder reminders as ready-to-send lines for a daily summary. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if (auth.response) return auth.response;

    const notifications = await listRows(auth.client, 'notifications', {
      ownerId: auth.user.id,
      eq: { read: false },
      order: { column: 'created_at', ascending: false },
      limit: 20,
    });

    const reminders = notifications
      .filter((n) => String(n.message || '').trim())
      .map((n) => `Ladder: ${n.message}`);

    return json({
      count: reminders.length,
      reminders,
      text: reminders.length > 0 ? reminders.join('\n') : 'No ladder reminders today.',
    });
  } catch (error) {
    return handleError(error);
  }
});
