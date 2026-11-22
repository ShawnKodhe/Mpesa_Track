-- Resend confirmation emails + scheduled reports.
-- Supabase Auth confirmations stay OFF: an auth.users trigger queues a Resend
-- confirmation, and pg_cron/pg_net call the daily and monthly report functions.
-- Run in the Supabase SQL editor (or `supabase db push`) AFTER deploying the
-- three new functions and setting the Supabase secrets documented in README.

create schema if not exists extensions;

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $vault$
begin
  if not exists (select 1 from pg_extension where extname = 'supabase_vault') then
    execute 'create schema if not exists vault';
    execute 'create extension supabase_vault with schema vault';
  end if;
end
$vault$;

-- The URL is public. The shared secret must match the Supabase secret
-- MPESATRACK_REPORT_SECRET. Replace the placeholder below in the Vault UI or
-- with the UPDATE statement in README.md.
do $secrets$
begin
  if not exists (select 1 from vault.secrets where name = 'mpesatrack_project_url') then
    perform vault.create_secret(
      'https://nlwsbsfpaogpzhpcetgf.supabase.co',
      'mpesatrack_project_url',
      'MpesaTrack Supabase project URL used by scheduled functions'
    );
  end if;
  if not exists (select 1 from vault.secrets where name = 'mpesatrack_report_secret') then
    perform vault.create_secret(
      'REPLACE_WITH_A_LONG_RANDOM_STRING',
      'mpesatrack_report_secret',
      'Shared secret for send-confirmation-email, daily-report and monthly-report'
    );
  end if;
end
$secrets$;

-- Single, least-privilege bridge from Postgres to the server-only functions.
create or replace function public.mpesatrack_invoke_function(function_name text, payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = public, net, vault, extensions
as $invoke$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'mpesatrack_project_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'mpesatrack_report_secret';

  if v_url is null or v_secret is null then
    raise exception 'MpesaTrack Vault secrets are missing';
  end if;
  if function_name !~ '^[a-z][a-z0-9-]*$' then
    raise exception 'Invalid function name';
  end if;

  return net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-mpesatrack-secret', v_secret
    ),
    body := coalesce(payload, '{}'::jsonb),
    timeout_milliseconds := 10000
  );
end
$invoke$;

revoke all on function public.mpesatrack_invoke_function(text, jsonb) from public, anon, authenticated;

-- Confirmation: Resend sends it; Supabase Auth emails nothing.
create or replace function public.mpesatrack_queue_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public, net, vault, extensions
as $confirm$
begin
  begin
    perform public.mpesatrack_invoke_function('send-confirmation-email', jsonb_build_object(
      'user_id', new.id::text,
      'email', coalesce(new.email, ''),
      'full_name', coalesce(new.raw_user_meta_data ->> 'full_name', '')
    ));
  exception when others then
    -- Email must never break signup.
    raise warning 'MpesaTrack confirmation email could not be queued: %', sqlerrm;
  end;
  return new;
end
$confirm$;

drop trigger if exists mpesatrack_queue_confirmation on auth.users;
create trigger mpesatrack_queue_confirmation
after insert on auth.users
for each row execute function public.mpesatrack_queue_confirmation();

-- Report delivery ledger: makes monthly emails safe to retry.
create table if not exists public.report_deliveries (
  owner_id uuid not null references auth.users(id) on delete cascade,
  report_key text not null,
  kind text not null check (kind in ('monthly')),
  sent_at timestamptz not null default now(),
  primary key (owner_id, report_key)
);

alter table public.report_deliveries enable row level security;
drop policy if exists report_deliveries_owner_read on public.report_deliveries;
create policy report_deliveries_owner_read
  on public.report_deliveries for select to authenticated
  using (owner_id = auth.uid());

-- The daily digest lives in the notifications table; widen its rule label.
alter table public.notifications drop constraint if exists notifications_rule_check;
alter table public.notifications add constraint notifications_rule_check
  check (rule in ('monthly', 'deadline', 'behind', 'completion', 'daily'));

-- Cron runs in UTC. Nairobi is UTC+3 all year: 07:00 EAT = 04:00 UTC,
-- 08:00 EAT on the 1st = 05:00 UTC on the 1st.
do $cron$
begin
  if exists (select 1 from cron.job where jobname = 'mpesatrack-daily-jarvis-report') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'mpesatrack-daily-jarvis-report';
  end if;
  perform cron.schedule(
    'mpesatrack-daily-jarvis-report',
    '0 4 * * *',
    $job$select public.mpesatrack_invoke_function('daily-report', jsonb_build_object('kind', 'daily'))$job$
  );

  if exists (select 1 from cron.job where jobname = 'mpesatrack-monthly-report') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'mpesatrack-monthly-report';
  end if;
  perform cron.schedule(
    'mpesatrack-monthly-report',
    '0 5 1 * *',
    $job$select public.mpesatrack_invoke_function('monthly-report', jsonb_build_object('kind', 'monthly'))$job$
  );
end
$cron$;

-- Inspect schedules: select jobname, schedule, active from cron.job;
-- Inspect Resend/function responses: select status_code, content from net._http_response;
