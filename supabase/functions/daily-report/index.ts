import { corsHeaders, handleError, json, serviceClient } from '../_shared/mod.ts';
import { requireInternal } from '../_shared/internal.ts';
import { sendEmail } from '../_shared/email.ts';
import { dailyReportHtml } from '../_shared/report-email.ts';
import { allUsers, buildPeriodData, jarvisDailyMessage, ledgerTodayKey, previousDayRange, prettyDate } from '../_shared/report-data.ts';

/**
 * 07:00 Africa/Nairobi (04:00 UTC). One Jarvis-toned Resend email and one
 * in-app notification per user about the previous day's spending and balances.
 * `report_deliveries` makes email retries harmless.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const guard = requireInternal(req);
  if (guard) return guard;

  try {
    const client = serviceClient();
    const today = ledgerTodayKey();
    const { start } = previousDayRange(today);
    const appUrl = (Deno.env.get('APP_URL') || 'https://mpesatrack.com').replace(/\/$/, '');
    const users = await allUsers(client);
    const reportKey = `daily-${start}`;
    let emailed = 0;
    let notified = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const data = await buildPeriodData(client, user.id, start, start, today);
        const message = jarvisDailyMessage(data, user.full_name, start);

        try {
          const { error } = await client.from('notifications').upsert({
            owner_id: user.id,
            title: `Jarvis — yesterday, ${prettyDate(start)}`,
            message,
            rule: 'daily',
            dedupe_key: `jarvis-daily-${start}`,
            read: false,
          }, { onConflict: 'owner_id,dedupe_key' });
          if (error) throw error;
          notified += 1;
        } catch (error) {
          failed += 1;
          console.error('Daily notification failed for', user.id, error);
        }

        try {
          const existing = await client.from('report_deliveries')
            .select('report_key').eq('owner_id', user.id).eq('report_key', reportKey).maybeSingle();
          if (existing.error) throw existing.error;
          if (existing.data) {
            skipped += 1;
            continue;
          }

          const delivered = await sendEmail({
            to: user.email,
            subject: `Yesterday — your MpesaTrack report`,
            html: dailyReportHtml({ ...data, date: start, firstName: user.full_name, note: message, appUrl }),
          });
          if (!delivered) throw new Error('Resend did not accept the daily report');

          const { error } = await client.from('report_deliveries').upsert({
            owner_id: user.id,
            report_key: reportKey,
            kind: 'daily',
          }, { onConflict: 'owner_id,report_key' });
          if (error) throw error;
          emailed += 1;
        } catch (error) {
          failed += 1;
          console.error('Daily email failed for', user.id, error);
        }
      } catch (error) {
        failed += 1;
        console.error('Daily report failed for', user.id, error);
      }
    }

    console.log('Daily Jarvis reports:', { users: users.length, emailed, notified, skipped, failed, date: start });
    return json({ users: users.length, emailed, notified, skipped, failed, date: start });
  } catch (error) {
    return handleError(error);
  }
});
