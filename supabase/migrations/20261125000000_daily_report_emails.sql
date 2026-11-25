-- Daily reports now email through Resend in addition to creating an in-app
-- notification. Let the delivery ledger record one key per day as well as
-- one per month so retries never send the same digest twice.
do $kind$
declare
  constraint_name name;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.report_deliveries'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%kind%'
  loop
    execute format('alter table public.report_deliveries drop constraint %I', constraint_name);
  end loop;
end
$kind$;

alter table public.report_deliveries add constraint report_deliveries_kind_check
  check (kind in ('daily', 'monthly'));
