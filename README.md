# MpesaTrack

A calm, clear view of your M-Pesa money. React + Vite on the front, Supabase (Auth, Postgres, Storage, Realtime and Edge Functions) behind it.

## Stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Query
- **Backend:** Supabase Auth, Postgres with row level security, Storage, Realtime
- **AI:** Base44 LLM via AI Gateway (Jarvis, action parsing, M-Pesa SMS import)
- **Email:** Resend (account confirmations, password resets, backup-email verification, budget alerts, daily and monthly reports)
- **Speech:** ElevenLabs (Jarvis voice replies)

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set your project URL and anon key:

   ```bash
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_APP_URL=http://localhost:5173
   ```

3. Apply the database schema. Paste `supabase/migrations/20261121000000_initial.sql`, `20261122000000_reports_and_confirmation.sql`, `20261123000000_tutorial_recovery.sql` and `20261125000000_daily_report_emails.sql` into the Supabase SQL editor in that order, or use the CLI:

   ```bash
   supabase db push
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

## Edge Functions

Deploy the functions in `supabase/functions`:

```bash
supabase functions deploy loan-ledger
supabase functions deploy jarvis-chat
supabase functions deploy jarvis-act
supabase functions deploy jarvis-speak
supabase functions deploy usage-stats
supabase functions deploy parse-mpesa
supabase functions deploy check-budget-threshold
supabase functions deploy ladder-reminders
supabase functions deploy send-confirmation-email
supabase functions deploy daily-report
supabase functions deploy monthly-report
supabase functions deploy request-password-reset
supabase functions deploy set-secondary-email
supabase functions deploy verify-secondary-email
```

`send-confirmation-email`, `daily-report` and `monthly-report` are server-only: `config.toml` registers them with `verify_jwt = false`, and a shared `x-mpesatrack-secret` header guards them. Do not call them from the browser. `request-password-reset` and `verify-secondary-email` are public but rate-limited; `set-secondary-email` requires a signed-in user.

Set the function secrets in your Supabase project:

```bash
supabase secrets set BASE44_LLM_FUNCTION_URL=https://your-app.base44.app/functions/llm-complete-json
supabase secrets set BASE44_LLM_SECRET=the-shared-secret-you-chose
supabase secrets set RESEND_API_KEY=...
supabase secrets set RESEND_FROM="MpesaTrack <alerts@yourdomain.com>"  # use a verified domain in production
supabase secrets set APP_URL=https://your-app.vercel.app
supabase secrets set MPESATRACK_REPORT_SECRET=a-long-random-string-you-generate
supabase secrets set ELEVENLABS_API_KEY=sk_your_full_key
supabase secrets set BASE44_API_KEY=your_base44_personal_access_token
```

`MPESATRACK_REPORT_SECRET` must be the same value stored in Supabase Vault as `mpesatrack_report_secret` (see below). `APP_URL` is the public frontend URL used in email buttons.

> Any API key in a local `.env` that starts with `VITE_` is embedded in the browser bundle if referenced by the app. Keep Resend, ElevenLabs and Base44 keys out of `VITE_*` entirely — set them with `supabase secrets set` as above. In particular, `VITE_RESEND_API_KEY` and `VITE_RESEND_FROM_EMAIL` are ignored by Edge Functions: use the `RESEND_API_KEY` and `RESEND_FROM` secrets instead. `.env` is gitignored, but it is not a safe place for live keys.

`usage-stats` returns remaining ElevenLabs characters and Base44 integration credits for the small balance line under Jarvis' chat box. The Base44 monitoring API only allows workspace owners/admins, so the personal access token must belong to one. `BASE44_WORKSPACE_ID` is detected from the token automatically; set it explicitly if you have access to several workspaces.

### Base44 LLM setup

Base44's `aiGateway.connection()` and service role only work inside a Base44 backend function, so this app includes a tiny proxy at `base44/functions/llm-complete-json/entry.ts`.

1. Copy `base44/functions/llm-complete-json/` into a Base44 backend project (or add it to your existing Base44 app).
2. In that Base44 app, add a secret named `MPESA_TRACK_PROXY_SECRET` with a long random value.
3. Deploy the function:

   ```bash
   npx base44 functions deploy llm-complete-json
   ```

4. Set the same value as `BASE44_LLM_SECRET` in Supabase, and point `BASE44_LLM_FUNCTION_URL` at the deployed function URL.
5. Redeploy the Supabase functions that use AI:

   ```bash
   supabase functions deploy jarvis-chat
   supabase functions deploy parse-mpesa
   supabase functions deploy jarvis-speak
   supabase functions deploy usage-stats
   ```

6. Remove the old provider secrets:

   ```bash
   supabase secrets unset GROQ_API_KEY
   supabase secrets unset GROQ_MODEL
   ```

The proxy uses Base44's AI Gateway, so calls are billed to your Base44 app credits; no separate model-provider key is needed.

Values in a local `.env` are only visible to Vite, not to Supabase Edge Functions. Set `ELEVENLABS_API_KEY` with `supabase secrets set` as above or Jarvis will fall back to the device voice. Use the full secret key shown when the key is created or rotated — it starts with `sk_` — not the API key ID shown in the dashboard.

**Speech is strictly opt-in.** No ElevenLabs request is made — and no characters are billed — until you switch on **Speak replies aloud** in the Jarvis voice menu. The default is off. The client re-checks a live copy of that flag at the moment a reply arrives (so switching it off mid-reply also prevents the call), and `jarvis-speak` rejects any request that lacks the explicit `speakEnabled: true` flag before it touches ElevenLabs. Redeploy `jarvis-speak` so this guard is live in your project. The credit readout under the chat box only reads ElevenLabs' subscription endpoint; it never synthesizes speech.

If a spoken reply feels slow, the wait is one of two stages: the Base44 LLM writing the reply, then ElevenLabs synthesising it. Each stage logs millisecond timings — `jarvisChat ledger snapshot`, `jarvisChat LLM reply`, `llm-complete-json responded` and `jarvisSpeak succeeded` — in the Supabase and Base44 function logs. `jarvis-speak` sends plain text to one model, caps each ElevenLabs attempt at 15 seconds and the whole retry chain at 25 seconds. Redeploy `jarvis-speak` and `jarvis-chat`; redeploy the Base44 proxy too if you want its timing log.

Jarvis defaults to ElevenLabs' **Charlie** (`IKne3meq5aSn9XLyUdCD`), with **Lily** (`pFZP5JQG7iQjIQuC4Bku`) selectable from the voice menu for both English and Kiswahili. Speech is plain: no audio tags, no `hmm`, scoffs, sighs, pauses or breath sounds. The replies themselves keep Jarvis' wit, sarcasm and dry humour; only the vocal tics are gone. If the chosen voice is unavailable, it falls back to **Baxter** (`jSuBIjxMKhqIfb0wCK1F`).

**Both are ElevenLabs Default voices and expire on 31 December 2026** (Lily's listed replacement is Florence); accounts created after March 2026 may not have them. If the key is missing or invalid, Jarvis falls back to a device voice — replace the secret with the full `sk_` key to hear ElevenLabs at all.

Override the defaults with `ELEVENLABS_VOICE_EN` / `ELEVENLABS_VOICE_SW`, the model with `ELEVENLABS_MODEL` (default `eleven_multilingual_v2`), or the fallback with `ELEVENLABS_FALLBACK_VOICE`. Redeploy `jarvis-speak` after changing a voice setting, and `jarvis-chat` after changing a tone setting.

Other optional overrides: `BASE44_LLM_MODEL` (set in Base44 alongside `MPESA_TRACK_PROXY_SECRET`, defaults to `automatic`), `BASE44_WORKSPACE_ID`, `BASE44_APP_ID`.

## Auth

Email/password sign-up, sign-in and session handling are managed by Supabase Auth. All outbound account email is sent by Resend: an `auth.users` trigger queues confirmations, and the forgot-password flow asks Supabase to generate a one-time recovery token but emails the link itself. In the hosted project, open **Authentication → Providers → Email** and make sure **Confirm email** is off — `config.toml` only controls local development. Enable the Google provider in **Authentication → Providers**, and add `VITE_APP_URL` (and your production URL) to the allowed redirect URLs in **Authentication → URL Configuration**.

### Password reset and backup email

The forgot-password form accepts either the sign-in email or a **verified** backup address. `request-password-reset` looks up the account through the security-definer helper in the recovery migration, creates a Supabase recovery link, and emails a themed link through Resend. Supabase sends nothing itself. The reset page redeems `token_hash` and sets the new password as before.

In **Profile → Backup recovery email**, a signed-in user can add a second address. `set-secondary-email` saves it as pending and emails a one-time verification link to that address. Until the link is opened in `/verify-secondary-email`, the address is ignored by password reset. Opening the link promotes it to verified; the token is then cleared. Removing the address clears both the verified and pending values. `auth_email_requests` rate-limits each address to three reset or verification emails per ten minutes, and the endpoint always gives a generic answer so accounts cannot be enumerated.

Profile fields (name, phone, avatar, currency, onboarding state, verified and pending backup email) live in the `profiles` table and are created automatically for each new auth user. The backup columns are added by `20261123000000_tutorial_recovery.sql`.

## App tour

New users get a short interactive tour on their first authenticated visit. Each step spotlights a navigation panel, explains it in plain language, asks for one tiny tap, and moves on. Progress is stored per user in `localStorage` as `mpesatrack-tour-done:<user-id>`, so it never gets in the way twice. A help button in the sidebar/header and **Settings → App tour → Replay tour** start it again. The tour only navigates between panels; it does not change data.

## Confirmation and scheduled reports

Apply `supabase/migrations/20261122000000_reports_and_confirmation.sql` and `supabase/migrations/20261125000000_daily_report_emails.sql` after deploying the three new functions. The first enables `pg_cron`, `pg_net` and Vault and does four things; the second lets the delivery ledger record daily emails as well as monthly ones:

1. **Resend confirmation.** An `after insert on auth.users` trigger calls `send-confirmation-email`, which sends a themed "you're in" note using the paper theme's warm off-white, deep teal and brand mark. Supabase Auth sends nothing. Google sign-ups get the same note.
2. **Daily Jarvis digest.** `daily-report` runs at **04:00 UTC (07:00 Nairobi)**. For every user it emails a themed Resend report and writes one in-app `notifications` row about the previous day's spending, top categories, wallet balances and active loans. `dedupe_key = jarvis-daily-YYYY-MM-DD` keeps the in-app row idempotent; `report_key = daily-YYYY-MM-DD` in `report_deliveries` does the same for email.
3. **Monthly report.** `monthly-report` runs at **05:00 UTC on the 1st (08:00 Nairobi)**. It emails each user a Resend report for the month just ended: headline spend/received/net cards, category bars, a day-by-day spending chart, budget health, wallet balances, Ladder progress and a dry Jarvis verdict. The layout uses nested tables and inline styles only, so it renders in Outlook and Gmail. `report_deliveries` prevents duplicate sends.
4. **Vault + schedules.** Two Vault secrets hold the project URL and the shared secret. Generate one long random string and use it for **both** the Supabase secret `MPESATRACK_REPORT_SECRET` and the Vault secret `mpesatrack_report_secret`:

   ```sql
   select vault.update_secret(
     (select id from vault.secrets where name = 'mpesatrack_report_secret'),
     'the-same-long-random-string',
     null,
     null
   );
   ```

   Run that in the SQL Editor, not in a migration file — the plain value would otherwise be committed to the repository. If the secret does not exist yet, use `select vault.create_secret('the-same-long-random-string', 'mpesatrack_report_secret');` instead.

   The migration creates that Vault secret with a placeholder if it does not exist, so replace the placeholder before the first scheduled run. Both functions return `401` until the two values match.

Useful checks in the SQL editor:

```sql
select jobname, schedule, active from cron.job;
select status_code, timed_out, left(content, 240) as body
  from net._http_response order by created desc limit 20;
select owner_id, title, message from public.notifications
  where rule = 'daily' order by created_at desc limit 10;
select kind, report_key, sent_at from public.report_deliveries order by sent_at desc limit 10;
```

`pg_net` only queues the request, so a green `cron.job_run_details` row does not prove delivery — check `net._http_response` and the function logs. The daily report covers the previous calendar day in Africa/Nairobi; the monthly report covers the previous full month and deliberately excludes transfers between your own accounts.

## Deploy to Vercel

The frontend is a static Vite SPA. `vercel.json` declares the framework, build command, output directory and an SPA fallback, so direct links such as `/reset-password` and `/jarvis` load `index.html` instead of a 404. Files in `public/` (`favicon.svg`, `manifest.json`) and hashed build assets are served normally.

1. Import the repository in Vercel. The Vite preset is detected from `vercel.json`; no build settings need changing.
2. Under **Project Settings → Environment Variables**, add these for Production (and Preview, if you want previews to work):
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — the **anon/public** key only
   - `VITE_APP_URL` — the deployed URL, e.g. `https://your-app.vercel.app`, with no trailing slash
3. Deploy. Vercel runs `npm run build` and serves `dist/`.
4. In Supabase, open **Authentication → URL Configuration**: set the Site URL to the same production URL and add both the exact URL and `https://your-app.vercel.app/**` to Redirect URLs. For Google sign-in, add `https://<project-ref>.supabase.co/auth/v1/callback` to the provider's allowed callback URLs.
5. Deploy the Supabase functions and set their secrets as described above. Vercel hosts only the static frontend; the backend stays on Supabase.

Never put the service-role key, `ELEVENLABS_API_KEY`, Base44 or Resend keys in Vercel: every `VITE_*` variable is embedded in the browser bundle. Those values belong in Supabase secrets. Re-run `supabase functions deploy <name>` after changing a secret, and redeploy in Vercel after changing a `VITE_*` value.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — lint with ESLint
- `npm run typecheck` — check the JS config
