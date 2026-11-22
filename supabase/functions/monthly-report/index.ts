import { corsHeaders, handleError, json, serviceClient } from '../_shared/mod.ts';
import { requireInternal } from '../_shared/internal.ts';
import { sendEmail } from '../_shared/email.ts';
import { monthlyReportHtml } from '../_shared/report-email.ts';
import { allUsers, buildPeriodData, ledgerTodayKey, previousMonthRange } from '../_shared/report-data.ts';

/**
 * 08:00 Africa/Nairobi (05:00 UTC) on the 1st. One themed Resend email per
 * user for the month that just closed. `report_deliveries` prevents duplicates
 * if the job is retried.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const guard = requireInternal(req);
  if (guard) return guard;

  try {
    const client = serviceClient();
    const today = ledgerTodayKey();
    const { start, end, label } = previousMonthRange(today);
    const appUrl = (Deno.env.get('APP_URL') || 'https://mpesatrack.com').replace(/\/$/, '');
    const users = await allUsers(client);
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
      const reportKey = `monthly-${start}`;
      try {
        const existing = await client.from('report_deliveries')
          .select('report_key').eq('owner_id', user.id).eq('report_key', reportKey).maybeSingle();
        if (existing.error) throw existing.error;
        if (existing.data) {
          skipped += 1;
          continue;
        }

        const data = await buildPeriodData(client, user.id, start, end, today);
        const delivered = await sendEmail({
          to: user.email,
          subject: `${label} — your MpesaTrack report`,
          html: monthlyReportHtml({ ...data, label, firstName: user.full_name, appUrl }),
        });
        if (!delivered) throw new Error('Resend did not accept the report');

        const { error } = await client.from('report_deliveries').upsert({
          owner_id: user.id,
          report_key: reportKey,
          kind: 'monthly',
        }, { onConflict: 'owner_id,report_key' });
        if (error) throw error;
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error('Monthly report failed for', user.id, error);
      }
    }

    console.log('Monthly reports:', { users: users.length, sent, skipped, failed, period: `${start}..${end}` });
    return json({ users: users.length, sent, skipped, failed, period: { start, end, label } });
  } catch (error) {
    return handleError(error);
  }
});
