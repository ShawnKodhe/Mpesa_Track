-- MpesaTrack initial schema
-- Run with the Supabase SQL editor or `supabase db push`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (app-specific fields for auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  phone_number text,
  profile_picture text,
  currency text not null default 'KES',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Ledger tables. Every row is owned by one auth user; RLS is the only gate.
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in
    ('sent','received','payment','withdrawal','deposit','airtime','transfer',
     'credit_purchase','loan','adjustment')),
  amount numeric(14,2) not null,
  recipient text,
  category text not null,
  description text,
  transaction_date date not null,
  mpesa_ref text,
  warning text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null,
  amount numeric(14,2) not null,
  period text not null default 'monthly' check (period in ('weekly','monthly')),
  is_necessity boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lender text not null,
  debt_type text not null default 'cash_loan' check (debt_type in ('cash_loan','trade_debt')),
  principal numeric(14,2) not null,
  balance numeric(14,2) not null,
  interest_rate numeric(8,2),
  installment_amount numeric(14,2),
  next_payment_date date,
  frequency text not null default 'monthly' check (frequency in ('one_time','weekly','biweekly','monthly')),
  status text not null default 'active' check (status in ('active','settled','paid_off')),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.debts_owed (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  debtor text not null,
  original_amount numeric(14,2) not null,
  balance numeric(14,2) not null,
  due_date date,
  status text not null default 'outstanding' check (status in ('outstanding','settled')),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jarvis_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  text text not null,
  actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ladder_rungs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "order" numeric(6,2) not null,
  name text not null,
  type text not null default 'buffer' check (type in ('buffer','debt','investment')),
  target_amount numeric(14,2) not null,
  current_amount numeric(14,2) not null default 0,
  monthly_contribution numeric(14,2) not null default 0,
  start_date date,
  target_date date,
  advantages text[] not null default '{}',
  status text not null default 'locked' check (status in ('locked','active','complete')),
  liquidity text not null default 'liquid' check (liquidity in ('liquid','locked','invested')),
  category_label text,
  colour text,
  icon text,
  linked_budget_category text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ladder_contributions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rung_id text not null,
  amount numeric(14,2) not null,
  contribution_date date not null,
  source text not null default 'manual' check (source in ('manual','budget','auto')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ladder_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  monthly_reminder boolean not null default true,
  deadline_alert boolean not null default true,
  behind_pace boolean not null default true,
  completion_notice boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  rule text check (rule in ('monthly','deadline','behind','completion')),
  rung_id text,
  dedupe_key text,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, dedupe_key)
);

create table if not exists public.reconciliations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recon_date date not null,
  account text not null check (account in ('M-PESA','Britam MMF','M-Shwari','Cash','Other')),
  expected numeric(14,2) not null,
  actual numeric(14,2) not null,
  difference numeric(14,2) not null,
  adjustment_transaction_id text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  snapshot_date date not null,
  mpesa_balance numeric(14,2),
  mmf_balance numeric(14,2),
  mshwari_balance numeric(14,2),
  other_cash numeric(14,2) not null default 0,
  total numeric(14,2) not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated timestamps on every mutable table.
do $$
declare t text;
begin
  foreach t in array array[
    'transactions','budgets','loans','debts_owed','jarvis_messages','ladder_rungs',
    'ladder_contributions','ladder_settings','notifications','reconciliations','wallet_snapshots'
  ] loop
    execute format('drop trigger if exists %I_updated_at on public.%I', t, t);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Indexes for the filters the app actually uses
-- ---------------------------------------------------------------------------
create index if not exists transactions_owner_date_idx on public.transactions (owner_id, transaction_date desc);
create index if not exists transactions_owner_category_idx on public.transactions (owner_id, category);
create index if not exists budgets_owner_category_idx on public.budgets (owner_id, category);
create index if not exists loans_owner_lender_idx on public.loans (owner_id, lender);
create index if not exists loans_owner_next_payment_idx on public.loans (owner_id, next_payment_date desc);
create index if not exists debts_owner_due_idx on public.debts_owed (owner_id, due_date desc);
create index if not exists jarvis_owner_created_idx on public.jarvis_messages (owner_id, created_at desc);
create index if not exists rungs_owner_order_idx on public.ladder_rungs (owner_id, "order");
create index if not exists contributions_owner_date_idx on public.ladder_contributions (owner_id, contribution_date desc);
create index if not exists contributions_owner_rung_idx on public.ladder_contributions (owner_id, rung_id);
create index if not exists notifications_owner_created_idx on public.notifications (owner_id, created_at desc);
create index if not exists snapshots_owner_date_idx on public.wallet_snapshots (owner_id, snapshot_date desc);
create index if not exists recons_owner_date_idx on public.reconciliations (owner_id, recon_date desc);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.loans enable row level security;
alter table public.debts_owed enable row level security;
alter table public.jarvis_messages enable row level security;
alter table public.ladder_rungs enable row level security;
alter table public.ladder_contributions enable row level security;
alter table public.ladder_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.reconciliations enable row level security;
alter table public.wallet_snapshots enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array[
    'transactions','budgets','loans','debts_owed','jarvis_messages','ladder_rungs',
    'ladder_contributions','ladder_settings','notifications','reconciliations','wallet_snapshots'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'owner_' || t || '_access', t);
    execute format('create policy %I on public.%I for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())',
      'owner_' || t || '_access', t);
  end loop;
end $$;

-- An administrator may read conversation history for support.
drop policy if exists "jarvis_messages_admin_read" on public.jarvis_messages;
create policy "jarvis_messages_admin_read" on public.jarvis_messages
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- Realtime (used by the dashboard and budget screens)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['transactions','budgets','ladder_rungs'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Avatar storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select to public using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update to authenticated using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );
