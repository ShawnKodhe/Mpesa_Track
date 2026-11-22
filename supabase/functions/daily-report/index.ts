import { corsHeaders, handleError, json, serviceClient } from '../_shared/mod.ts';
import { requireInternal } from '../_shared/internal.ts';
import { allUsers, buildPeriodData, jarvisDailyMessage, ledgerTodayKey, previousDayRange, prettyDate } from '../_shared/report-data.ts';

/**
 * 07:00 Africa/Nairobi (04:00 UTC). Writes one Jarvis-toned, in-app
 * notification per user about the previous day's spending and balances.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const guard = requireInternal(req);
  if (guard) return guard;

  try {
    const client = serviceClient();
    const today = ledgerTodayKey();
    const { start } = previousDayRange(today);
    const users = await allUsers(client);
    let created = 0;
    let skipped = 0;

    for (const user of users) {
      try {
        const data = await buildPeriodData(client, user.id, start, start, today);
        const { error } = await client.from('notifications').upsert({
          owner_id: user.id,
          title: `Jarvis — yesterday, ${prettyDate(start)}`,
          message: jarvisDailyMessage(data, user.full_name, start),
          rule: 'daily',
          dedupe_key: `jarvis-daily-${start}`,
          read: false,
        }, { onConflict: 'owner_id,dedupe_key' });
        if (error) throw error;
        created += 1;
      } catch (error) {
        skipped += 1;
        console.error('Daily report failed for', user.id, error);
      }
    }

    console.log('Daily Jarvis reports:', { users: users.length, created, skipped, date: start });
    return json({ users: users.length, created, skipped, date: start });
  } catch (error) {
    return handleError(error);
  }
});
