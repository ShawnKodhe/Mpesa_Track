-- Backup recovery email + Resend password resets.
-- The app tour is device-local (localStorage); this migration only adds the
-- profile fields and server-side helpers needed by the recovery flow.

alter table public.profiles
  add column if not exists secondary_email text,
  add column if not exists secondary_email_verified_at timestamptz,
  add column if not exists pending_secondary_email text,
  add column if not exists pending_secondary_token_hash text,
  add column if not exists pending_secondary_expires_at timestamptz;

create index if not exists profiles_secondary_email_idx
  on public.profiles (lower(secondary_email))
  where secondary_email is not null;

-- Small request ledger so the public reset endpoint cannot be hammered.
-- RLS is enabled with no policies: only the service role (edge functions) can
-- read or write it.
create table if not exists public.auth_email_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  kind text not null check (kind in ('reset', 'secondary_verify')),
  requested_at timestamptz not null default now()
);

create index if not exists auth_email_requests_lookup_idx
  on public.auth_email_requests (email, kind, requested_at desc);

alter table public.auth_email_requests enable row level security;
revoke all on public.auth_email_requests from anon, authenticated;
grant select, insert on public.auth_email_requests to service_role;

-- Auth users cannot be queried from PostgREST, so edge functions call this
-- security-definer helper with the service role key.
create or replace function public.mpesatrack_find_user_by_email(p_email text)
returns table (id uuid, email text, full_name text, secondary_email text)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  return query
  select u.id,
         u.email::text,
         coalesce(p.full_name, ''),
         p.secondary_email
    from auth.users u
    left join public.profiles p on p.id = u.id
   where lower(coalesce(u.email, '')) = lower(p_email)
      or (
           p.secondary_email is not null
           and lower(p.secondary_email) = lower(p_email)
           and p.secondary_email_verified_at is not null
         )
   limit 1;
end;
$$;

revoke all on function public.mpesatrack_find_user_by_email(text) from public, anon, authenticated;
grant execute on function public.mpesatrack_find_user_by_email(text) to service_role;
