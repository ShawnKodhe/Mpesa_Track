-- MpesaTrack: replace all data for shawnkodhe07@gmail.com with the 22 Nov 2026 export.
-- Source: Current_Data/MpesaInsight_Data_Export.pdf
-- Safe to re-run: existing rows for this user are deleted first.
-- Run in the Supabase SQL editor (needs postgres/admin rights for the two ALTER TABLE lines).

begin;

-- The export contains two values the original schema did not allow. Widen them
-- so the snapshot can be stored exactly: 'once' budgets and a 'reserve' rung.
alter table public.budgets drop constraint if exists budgets_period_check;
alter table public.budgets add constraint budgets_period_check
  check (period in ('weekly', 'monthly', 'once'));
alter table public.ladder_rungs drop constraint if exists ladder_rungs_type_check;
alter table public.ladder_rungs add constraint ladder_rungs_type_check
  check (type in ('buffer', 'debt', 'investment', 'reserve'));

do $$
declare
  v_user uuid;
begin
  select id into v_user from auth.users where lower(email) = lower('shawnkodhe07@gmail.com');
  if v_user is null then raise exception 'No auth user with email shawnkodhe07@gmail.com'; end if;

  -- Full replace for this profile. Jarvis chat and notifications are not in the
  -- export, so they are cleared too; the app regenerates ladder notifications.
  delete from public.ladder_contributions where owner_id = v_user;
  delete from public.ladder_rungs where owner_id = v_user;
  delete from public.ladder_settings where owner_id = v_user;
  delete from public.notifications where owner_id = v_user;
  delete from public.transactions where owner_id = v_user;
  delete from public.budgets where owner_id = v_user;
  delete from public.loans where owner_id = v_user;
  delete from public.debts_owed where owner_id = v_user;
  delete from public.reconciliations where owner_id = v_user;
  delete from public.wallet_snapshots where owner_id = v_user;
  delete from public.jarvis_messages where owner_id = v_user;

  insert into public.profiles (id, full_name, currency, onboarded)
  values (v_user, 'Shawn Kodhe', 'KES', true)
  on conflict (id) do update
     set full_name = excluded.full_name, currency = excluded.currency,
         onboarded = true, updated_at = now();

  -- 213 transactions. 'Send Money' in the export maps to the schema's 'sent'.
  insert into public.transactions
    (owner_id, type, amount, recipient, category, description, transaction_date, mpesa_ref)
  values
    (v_user, 'payment', 300, 'Matatu', 'transport', 'Transport', '2026-10-16', null),
    (v_user, 'payment', 500, 'Clinic', 'health', 'AIDS test', '2026-10-16', null),
    (v_user, 'payment', 1100, 'Charity', 'charity', 'Charity', '2026-10-16', null),
    (v_user, 'payment', 2150, 'M-Shwari', 'loan repayment', 'M-Shwari loan repayment', '2026-10-16', null),
    (v_user, 'received', 17000, 'KPA', 'business', 'Payment from KPA (Kenya Ports Authority)', '2026-10-16', null),
    (v_user, 'payment', 3500, 'Companion', 'bum bum', 'Spending while out with a companion', '2026-10-16', null),
    (v_user, 'payment', 85, 'Local shop', 'food', 'Apple juice', '2026-10-17', null),
    (v_user, 'payment', 530, 'Local shop', 'household', 'Mosquito coil', '2026-10-17', null),
    (v_user, 'payment', 500, 'Congolese guy', 'grooming', 'Haircut at the barbershop', '2026-10-17', null),
    (v_user, 'payment', 1500, 'Companion', 'bum bum', 'Demurrage mini costs', '2026-10-17', null),
    (v_user, 'sent', 100, 'MWALIMU', 'transport', 'Send Money to MWALIMU (0715711628)', '2026-10-17', 'UJHJ0AZ568'),
    (v_user, 'payment', 85, 'Local shop', 'food', 'Minute Maid orange juice', '2026-10-18', null),
    (v_user, 'payment', 200, 'Guard', 'bum bum', 'Companion photos - not to his liking', '2026-10-18', null),
    (v_user, 'payment', 35, 'Water vendor', 'food', 'Drinking water', '2026-10-18', null),
    (v_user, 'payment', 30, 'Water vendor', 'food', 'Drinking water', '2026-10-19', null),
    (v_user, 'payment', 150, 'Local eatery', 'food', 'Breakfast', '2026-10-19', null),
    (v_user, 'payment', 230, 'Local eatery', 'food', 'Food', '2026-10-19', null),
    (v_user, 'payment', 50, 'Local shop', 'food', 'Sprite soda', '2026-10-20', null),
    (v_user, 'payment', 45, 'Kiosk', 'other', 'Cigarettes and matchbox', '2026-10-20', null),
    (v_user, 'payment', 85, 'Local shop', 'food', 'Predator energy drink', '2026-10-20', null),
    (v_user, 'payment', 2600, 'Companion', 'bum bum', 'Bum bum spending', '2026-10-20', null),
    (v_user, 'loan', 687, 'M-Shwari', 'loan', 'M-Shwari loan taken - due 12/11/2026', '2026-10-21', null),
    (v_user, 'received', 2000, 'Dad', 'family', 'Payment from Dad', '2026-10-21', null),
    (v_user, 'payment', 2500, 'Companion', 'bum bum', 'Bum bum spending', '2026-10-21', null),
    (v_user, 'payment', 250, 'Matatu', 'transport', 'Transport', '2026-10-21', null),
    (v_user, 'payment', 800, 'Pharmacy', 'bum bum', 'Rubbers (protection)', '2026-10-21', null),
    (v_user, 'payment', 85, 'Local shop', 'food', 'Predator energy drink', '2026-10-21', null),
    (v_user, 'payment', 100, 'Tuk-tuk', 'transport', 'Tuk-tuk ride', '2026-10-21', null),
    (v_user, 'payment', 40, 'Local eatery', 'food', 'Mihogo', '2026-10-21', null),
    (v_user, 'payment', 250, 'Local eatery', 'food', 'Chapati and maharagwe', '2026-10-21', null),
    (v_user, 'payment', 110, 'Kiosk', 'food', 'Tea and donuts', '2026-10-21', null),
    (v_user, 'payment', 185, 'Kiosk', 'food', 'Donuts and apple juice', '2026-10-22', null),
    (v_user, 'payment', 10, 'Kiosk', 'food', 'Gum', '2026-10-22', null),
    (v_user, 'payment', 35, 'Kiosk', 'other', 'Double switch cigarette', '2026-10-22', null),
    (v_user, 'payment', 250, 'Local eatery', 'food', 'Chapati and beans', '2026-10-22', null),
    (v_user, 'payment', 60, 'Kiosk', 'food', 'Donuts', '2026-10-22', null),
    (v_user, 'payment', 900, 'Hustler Fund', 'loan repayment', 'Hustler Fund loan repayment', '2026-10-22', null),
    (v_user, 'payment', 85, 'Local shop', 'food', 'Predator energy drink', '2026-10-23', null),
    (v_user, 'payment', 30, 'Water vendor', 'food', 'Drinking water', '2026-10-23', null),
    (v_user, 'payment', 250, 'Local eatery', 'food', 'Chapati, beans and apple juice', '2026-10-23', null),
    (v_user, 'payment', 60, 'Kiosk', 'food', 'Donuts', '2026-10-23', null),
    (v_user, 'loan', 900, 'Hustler Fund', 'loan', 'Hustler Fund loan taken - due 6/11/2026', '2026-10-23', null),
    (v_user, 'payment', 610, 'QuickMart', 'food', 'QuickMart shopping', '2026-10-24', null),
    (v_user, 'payment', 350, 'Laundry service', 'household', 'Laundry', '2026-10-24', null),
    (v_user, 'received', 1000, 'Mum', 'family', 'Payment from Mum', '2026-10-24', null),
    (v_user, 'received', 2000, 'Dad', 'family', 'Payment from Dad', '2026-10-25', null),
    (v_user, 'payment', 250, 'Local eatery', 'food', '3 chapos, beans and apple juice', '2026-10-26', null),
    (v_user, 'sent', 150, 'Eudia', 'family', 'Sent to cousin Eudia', '2026-10-26', null),
    (v_user, 'payment', 100, 'Charity', 'charity', 'Charity', '2026-10-27', null),
    (v_user, 'received', 3000, 'Omar', 'other', 'Received from Omar', '2026-10-27', null),
    (v_user, 'payment', 250, 'Local eatery', 'food', 'Chapati and beans', '2026-10-27', null),
    (v_user, 'payment', 60, 'Kiosk', 'food', 'Donuts', '2026-10-27', null),
    (v_user, 'payment', 500, 'Everlyne', 'loan repayment', 'Settled Everlyne''s debt', '2026-10-28', null),
    (v_user, 'received', 1500, 'Mum', 'family', 'Payment from Mum', '2026-10-28', null),
    (v_user, 'payment', 2200, 'Companion', 'bum bum', 'Bum bum spending', '2026-10-28', null),
    (v_user, 'payment', 85, 'Local shop', 'food', 'Predator energy drink', '2026-10-28', null),
    (v_user, 'payment', 30, 'Water vendor', 'food', 'Drinking water', '2026-10-28', null),
    (v_user, 'payment', 310, 'Local eatery', 'food', 'Chapati and beans', '2026-10-28', null),
    (v_user, 'sent', 500, 'Jermaine', 'other', 'Sent to Jermaine', '2026-10-28', null),
    (v_user, 'payment', 40, 'Kiosk', 'food', 'Donuts', '2026-10-28', null),
    (v_user, 'payment', 550, 'Caretaker', 'household', 'Paid caretaker', '2026-10-28', null),
    (v_user, 'payment', 35, 'Water vendor', 'food', 'Drinking water', '2026-10-29', null),
    (v_user, 'payment', 310, 'Local eatery', 'food', 'Chapati and beans', '2026-10-29', null),
    (v_user, 'payment', 40, 'Kiosk', 'food', 'Donuts', '2026-10-29', null),
    (v_user, 'payment', 1290, 'Uber', 'transport', 'Uber ride', '2026-10-30', null),
    (v_user, 'received', 2000, 'Dad', 'family', 'Payment from Dad', '2026-10-30', null),
    (v_user, 'payment', 500, 'Safaricom', 'airtime', 'Airtime', '2026-10-30', null),
    (v_user, 'payment', 250, 'Local eatery', 'food', 'Lunch', '2026-10-30', null),
    (v_user, 'received', 500, 'Jermaine', 'receivable repayment', 'Jermaine repaid his debt', '2026-10-30', null),
    (v_user, 'payment', 30, 'Water vendor', 'food', 'Drinking water', '2026-10-30', null),
    (v_user, 'payment', 120, 'Local eatery', 'food', 'Chapos', '2026-10-30', null),
    (v_user, 'payment', 180, 'Local shop', 'food', 'Drinks', '2026-10-31', null),
    (v_user, 'payment', 30, 'Water vendor', 'food', 'Drinking water', '2026-11-02', null),
    (v_user, 'payment', 250, 'Local eatery', 'food', 'Chapo and minji', '2026-11-02', null),
    (v_user, 'payment', 120, 'Local eatery', 'food', 'Chapos', '2026-11-02', null),
    (v_user, 'payment', 240, 'Charity', 'charity', 'Charity', '2026-11-03', null),
    (v_user, 'payment', 320, 'Local eatery', 'food', 'Chapati and beans', '2026-11-03', null),
    (v_user, 'payment', 150, 'Matatu', 'transport', 'Transport', '2026-11-03', null),
    (v_user, 'payment', 2700, 'Companion', 'bum bum', 'Bill payment for service', '2026-11-03', null),
    (v_user, 'loan', 3000, 'Co-operative Bank', 'loan', 'Co-operative Bank E-Loan taken - due 3/12/2026', '2026-11-03', null),
    (v_user, 'payment', 900, 'Hustler Fund', 'loan repayment', 'Hustler Fund loan settled', '2026-11-03', null),
    (v_user, 'received', 400, 'Mum', 'family', 'Payment from Mum', '2026-11-03', null),
    (v_user, 'received', 1500, 'Dad', 'family', 'Payment from Dad', '2026-11-03', null),
    (v_user, 'payment', 110, 'Local eatery', 'food', 'Breakfast', '2026-11-03', null),
    (v_user, 'payment', 1800, 'Pet shop', 'Whiskers', 'Cat food', '2026-11-04', null),
    (v_user, 'payment', 3880, 'Gas vendor', 'household', 'Gas', '2026-11-04', null),
    (v_user, 'received', 9000, 'Dad', 'family', 'Payment from Dad', '2026-11-04', null),
    (v_user, 'payment', 760, 'Charity', 'charity', 'Charity', '2026-11-04', null),
    (v_user, 'payment', 3000, 'Co-operative Bank', 'loan repayment', 'Co-operative Bank E-Loan settled', '2026-11-04', null),
    (v_user, 'payment', 900, 'Hustler Fund', 'loan repayment', 'Hustler Fund loan settled', '2026-11-04', null),
    (v_user, 'payment', 687, 'M-Shwari', 'loan repayment', 'M-Shwari loan settled', '2026-11-04', null),
    (v_user, 'received', 23700, 'Co-operative Bank', 'business', 'Received from Co-operative Bank', '2026-11-04', null),
    (v_user, 'payment', 230, 'Local eatery', 'food', 'Chapo and beans', '2026-11-04', null),
    (v_user, 'payment', 100, 'Matatu', 'transport', 'Transport', '2026-11-04', null),
    (v_user, 'payment', 5300, 'Fuliza', 'loan repayment', 'Fuliza loan settled', '2026-11-05', null),
    (v_user, 'payment', 750, 'Local shop', 'grooming', 'Old Spice roll-on', '2026-11-05', null),
    (v_user, 'received', 800, 'Dad', 'family', 'Payment from Dad', '2026-11-05', null),
    (v_user, 'payment', 100, 'Matatu', 'transport', 'Morning transport', '2026-11-05', null),
    (v_user, 'payment', 30, 'Water vendor', 'food', 'Drinking water', '2026-11-05', null),
    (v_user, 'payment', 310, 'Local eatery', 'food', 'Chapati and beans', '2026-11-05', null),
    (v_user, 'payment', 100, 'Tuk-tuk', 'transport', 'Tuk-tuk ride', '2026-11-06', null),
    (v_user, 'payment', 500, 'Safaricom', 'airtime', 'Airtime', '2026-11-06', null),
    (v_user, 'payment', 250, 'Local eatery', 'food', 'Chapati and beans', '2026-11-06', null),
    (v_user, 'payment', 110, 'Kiosk', 'food', 'Mandazi and tea', '2026-11-06', null),
    (v_user, 'payment', 100, 'Matatu', 'transport', 'Transport', '2026-11-06', null),
    (v_user, 'payment', 1250, 'Pet shop', 'Whiskers', 'Cat litter', '2026-11-06', null),
    (v_user, 'loan', 5300, 'Fuliza', 'loan', 'Fuliza overdraft drawn 7 Nov, cash received', '2026-11-07', null),
    (v_user, 'received', 3000, 'Mum', 'family', 'Payment from Mum', '2026-11-07', null),
    (v_user, 'payment', 3600, 'Companion', 'bum bum', 'Bum bum spending', '2026-11-07', null),
    (v_user, 'payment', 105, 'Local shop', 'food', 'Predator and a donut', '2026-11-07', null),
    (v_user, 'payment', 500, 'Fruit vendor', 'food', 'Fruits', '2026-11-07', null),
    (v_user, 'payment', 570, 'Local eatery', 'food', 'Dinner', '2026-11-07', null),
    (v_user, 'payment', 100, 'Water vendor', 'food', 'Drinking water', '2026-11-08', null),
    (v_user, 'payment', 5500, 'Furniture shop', 'household', 'Chair and table', '2026-11-08', null),
    (v_user, 'payment', 500, 'Barber', 'grooming', 'Head shave', '2026-11-08', null),
    (v_user, 'payment', 320, 'Local eatery', 'food', 'Chapati and beans', '2026-11-08', null),
    (v_user, 'payment', 250, 'Local shop', 'transport', 'Tyres', '2026-11-08', null),
    (v_user, 'received', 3000, 'Omar', 'receivable repayment', 'Omar repaid his debt', '2026-11-08', null),
    (v_user, 'payment', 90, 'Local eatery', 'food', 'Lunch', '2026-11-08', null),
    (v_user, 'payment', 140, 'Local eatery', 'food', 'Breakfast', '2026-11-08', null),
    (v_user, 'payment', 100, 'Matatu', 'transport', 'Transport', '2026-11-09', null),
    (v_user, 'payment', 100, 'Fruit vendor', 'food', 'Fruits', '2026-11-09', null),
    (v_user, 'payment', 100, 'Water vendor', 'food', 'Drinking water', '2026-11-09', null),
    (v_user, 'received', 500, 'Business client', 'business', 'Business payment', '2026-11-09', null),
    (v_user, 'payment', 230, 'Local eatery', 'food', 'Chapati and beans', '2026-11-09', null),
    (v_user, 'payment', 100, 'Matatu', 'transport', 'Transport', '2026-11-09', null),
    (v_user, 'payment', 40, 'Kiosk', 'food', 'Donuts', '2026-11-09', null),
    (v_user, 'received', 3000, 'Omar', 'receivable repayment', 'Received from Omar', '2026-11-10', null),
    (v_user, 'payment', 100, 'Water vendor', 'food', 'Drinking water', '2026-11-10', null),
    (v_user, 'payment', 320, 'Local eatery', 'food', 'Dinner', '2026-11-10', null),
    (v_user, 'payment', 80, 'Local shop', 'food', 'Predator energy drink', '2026-11-10', null),
    (v_user, 'payment', 100, 'Matatu', 'transport', 'Transport', '2026-11-10', null),
    (v_user, 'payment', 100, 'Fruit vendor', 'food', 'Fruits', '2026-11-11', null),
    (v_user, 'payment', 1000, 'KPLC', 'Tokens', 'Electricity tokens', '2026-11-11', null),
    (v_user, 'payment', 120, 'Matatu', 'transport', 'Transport', '2026-11-11', null),
    (v_user, 'payment', 100, 'Matatu', 'transport', 'Morning transport', '2026-11-11', null),
    (v_user, 'payment', 110, 'Local eatery', 'food', 'Breakfast', '2026-11-11', null),
    (v_user, 'payment', 60, 'Water vendor', 'food', 'Drinking water', '2026-11-11', null),
    (v_user, 'payment', 210, 'Local eatery', 'food', 'Chapati and beans', '2026-11-11', null),
    (v_user, 'payment', 100, 'Fruit vendor', 'food', 'Fruits', '2026-11-12', null),
    (v_user, 'payment', 650, 'Safaricom', 'airtime', 'Airtime', '2026-11-12', null),
    (v_user, 'payment', 100, 'Matatu', 'transport', 'Transport', '2026-11-12', null),
    (v_user, 'payment', 310, 'Local eatery', 'food', 'Lunch', '2026-11-12', null),
    (v_user, 'payment', 30, 'Water vendor', 'food', 'Drinking water', '2026-11-12', null),
    (v_user, 'payment', 110, 'Matatu', 'transport', 'Transport', '2026-11-12', null),
    (v_user, 'payment', 110, 'Local eatery', 'food', 'Breakfast', '2026-11-12', null),
    (v_user, 'payment', 100, 'Matatu', 'transport', 'Transport', '2026-11-13', null),
    (v_user, 'payment', 30, 'Water vendor', 'food', 'Drinking water', '2026-11-13', null),
    (v_user, 'payment', 310, 'Local eatery', 'food', 'Chapati and beans', '2026-11-13', null),
    (v_user, 'payment', 110, 'Local eatery', 'food', 'Breakfast', '2026-11-13', null),
    (v_user, 'payment', 100, 'Tuk-tuk', 'transport', 'Tuk-tuk ride', '2026-11-13', null),
    (v_user, 'payment', 80, 'Local shop', 'food', 'Predator energy drink', '2026-11-13', null),
    (v_user, 'received', 1500, 'Mum', 'family', 'Payment from Mum', '2026-11-14', null),
    (v_user, 'payment', 1500, 'Pharmacy', 'bum bum', 'Condoms', '2026-11-14', null),
    (v_user, 'payment', 120, 'Water vendor', 'food', 'Drinking water', '2026-11-14', null),
    (v_user, 'payment', 320, 'Local eatery', 'food', 'Chapati, beans and soda', '2026-11-14', null),
    (v_user, 'payment', 150, 'Local shop', 'food', 'Predator and mandazi', '2026-11-14', null),
    (v_user, 'payment', 100, 'Water vendor', 'food', 'Drinking water', '2026-11-14', null),
    (v_user, 'payment', 300, 'Local eatery', 'food', 'Masala chips', '2026-11-14', null),
    (v_user, 'payment', 100, 'Tuk-tuk', 'transport', 'Tuk-tuk ride', '2026-11-14', null),
    (v_user, 'payment', 3600, 'Companion', 'bum bum', 'Bum bum spending', '2026-11-14', null),
    (v_user, 'payment', 100, 'Matatu', 'transport', 'Transport', '2026-11-15', null),
    (v_user, 'payment', 320, 'Local eatery', 'food', 'Food', '2026-11-15', null),
    (v_user, 'payment', 100, 'Matatu', 'transport', 'Transport', '2026-11-15', null),
    (v_user, 'payment', 140, 'Local eatery', 'food', 'Breakfast', '2026-11-15', null),
    (v_user, 'transfer', 1347, 'Britam MMF', 'Ladder: Buffer floor', 'Transfer to Britam Money Market Fund, buffer leg', '2026-11-16', null),
    (v_user, 'payment', 100, 'Matatu', 'transport', 'Transport', '2026-11-16', null),
    (v_user, 'payment', 60, 'Water vendor', 'food', 'Drinking water', '2026-11-16', null),
    (v_user, 'payment', 310, 'Local eatery', 'food', 'Chapati and beans', '2026-11-16', null),
    (v_user, 'received', 5000, 'Dad', 'family', 'Money sent by Dad', '2026-11-17', null),
    (v_user, 'payment', 100, 'Matatu', 'transport', 'Transport', '2026-11-17', null),
    (v_user, 'payment', 140, 'Local eatery', 'food', 'Breakfast', '2026-11-17', null),
    (v_user, 'payment', 100, 'Matatu', 'transport', 'Transport', '2026-11-17', null),
    (v_user, 'payment', 30, 'Water vendor', 'household', 'Drinking water', '2026-11-17', null),
    (v_user, 'received', 3500, 'Dad', 'family', 'Money sent by Dad', '2026-11-18', null),
    (v_user, 'payment', 1392, 'Domain registrar', 'family', 'Domain purchase for Dad''s website', '2026-11-18', null),
    (v_user, 'payment', 1200, 'Safaricom', 'airtime', 'Airtime', '2026-11-18', null),
    (v_user, 'payment', 450, 'Hardware shop', 'household', 'Tool set', '2026-11-18', null),
    (v_user, 'payment', 320, 'Local eatery', 'food', 'Dinner', '2026-11-18', null),
    (v_user, 'payment', 100, 'Matatu', 'transport', 'Evening transport', '2026-11-18', null),
    (v_user, 'received', 3000, 'Omar', 'receivable repayment', 'Omar repaid the 3,000 he owed', '2026-11-18', null),
    (v_user, 'payment', 2500, 'Tech shop', 'technology', 'SATA harddisk', '2026-11-18', null),
    (v_user, 'payment', 110, 'Local eatery', 'food', 'Breakfast', '2026-11-18', null),
    (v_user, 'payment', 200, 'Charity', 'charity', 'Charity', '2026-11-18', null),
    (v_user, 'payment', 100, 'Matatu', 'transport', 'Transport', '2026-11-18', null),
    (v_user, 'payment', 2500, 'Tech shop', 'technology', 'SSD purchase', '2026-11-19', null),
    (v_user, 'payment', 60, 'Water vendor', 'household', 'Water expense', '2026-11-19', null),
    (v_user, 'payment', 400, 'Local eatery', 'food', 'Food expense', '2026-11-19', null),
    (v_user, 'payment', 2500, 'Local shop', 'technology', 'SSD purchase', '2026-11-19', null),
    (v_user, 'loan', 500, 'Godfrey', 'loan', 'Loan from Godfrey, cash received', '2026-11-19', null),
    (v_user, 'loan', 2500, 'Masawa', 'loan', 'Loan from Masawa, cash received', '2026-11-19', null),
    (v_user, 'loan', 2000, 'M-Shwari', 'loan', 'M-Shwari loan drawn today, cash received', '2026-11-19', null),
    (v_user, 'payment', 100, 'Tuk-tuk', 'transport', 'Tuk-tuk ride', '2026-11-19', null),
    (v_user, 'payment', 100, 'Water vendor', 'household', 'Drinking water', '2026-11-19', null),
    (v_user, 'payment', 900, 'Hustler Fund', 'loan principal', 'Repayment of Hustler Fund loan', '2026-11-20', null),
    (v_user, 'loan', 900, 'Hustler Fund', 'loan', 'Hustler Fund loan', '2026-11-20', null),
    (v_user, 'payment', 900, 'Hustler Fund', 'loan principal', 'Repayment of Hustler Fund loan', '2026-11-20', null),
    (v_user, 'loan', 900, 'Hustler Fund', 'loan', 'Hustler Fund loan', '2026-11-20', null),
    (v_user, 'payment', 100, 'Tuk-tuk', 'transport', 'Transport expense', '2026-11-20', null),
    (v_user, 'payment', 100, 'Fruit vendor', 'food', 'Payment for fruits', '2026-11-20', null),
    (v_user, 'payment', 100, 'Water vendor', 'household', 'Payment for water', '2026-11-20', null),
    (v_user, 'payment', 3500, 'Companion', 'bum bum', 'Payment for bum bum', '2026-11-20', null),
    (v_user, 'payment', 100, 'Water vendor', 'household', 'Drinking water', '2026-11-20', null),
    (v_user, 'payment', 50, 'Kiosk', 'food', 'Nuts', '2026-11-20', null),
    (v_user, 'received', 1500, 'Dad', 'family', 'Money sent by Dad', '2026-11-20', null),
    (v_user, 'payment', 100, 'Tuk-tuk', 'transport', 'Tuk-tuk ride', '2026-11-20', null),
    (v_user, 'payment', 900, 'Hustler Fund', 'loan principal', 'Hustler Fund repaid same day, principal', '2026-11-20', null),
    (v_user, 'loan', 900, 'Hustler Fund', 'loan', 'Hustler Fund loan drawn today, cash received', '2026-11-20', null),
    (v_user, 'received', 3000, 'Dad', 'family', 'Money sent by Dad', '2026-11-21', null),
    (v_user, 'payment', 100, 'Water vendor', 'household', 'Drinking water', '2026-11-21', null),
    (v_user, 'payment', 320, 'Local eatery', 'food', 'Food', '2026-11-21', null),
    (v_user, 'payment', 80, 'Local shop', 'food', 'Predator energy drink', '2026-11-21', null),
    (v_user, 'payment', 140, 'Local eatery', 'food', 'Breakfast', '2026-11-21', null);

  -- 26 budget lines; inactive wishlist/future lines keep their exported active flag.
  insert into public.budgets (owner_id, category, amount, period, is_necessity, active)
  values
    (v_user, 'Ladder: Buffer floor', 5000, 'monthly', true, true),
    (v_user, 'Tokens', 2000, 'monthly', true, true),
    (v_user, 'Whiskers', 3000, 'monthly', false, true),
    (v_user, 'bum bum', 5500, 'monthly', true, true),
    (v_user, 'charity', 1500, 'monthly', true, true),
    (v_user, 'food', 18000, 'monthly', true, true),
    (v_user, 'transport', 6200, 'monthly', true, true),
    (v_user, '1 TB SSD', 16000, 'monthly', false, false),
    (v_user, '6 Wall Arts', 26400, 'once', false, false),
    (v_user, 'Anthem (game)', 649, 'once', false, false),
    (v_user, 'Business', 5000, 'monthly', true, false),
    (v_user, 'Engine Themed Coffee Mug', 4000, 'once', false, false),
    (v_user, 'Ladder: Business car', 24664, 'monthly', false, false),
    (v_user, 'Ladder: Business reinvestment', 5000, 'monthly', false, false),
    (v_user, 'Ladder: Clear Fuliza', 5300, 'monthly', false, false),
    (v_user, 'Ladder: Insurance-ready buffer', 5000, 'monthly', true, false),
    (v_user, 'Ladder: One month of essentials', 5000, 'monthly', true, false),
    (v_user, 'Ladder: Three months of essentials', 5000, 'monthly', true, false),
    (v_user, 'Ladder: Tuktuk', 10000, 'monthly', false, false),
    (v_user, 'Ladder: Two months of essentials', 5000, 'monthly', true, false),
    (v_user, 'Ladder: Used truck', 10000, 'monthly', false, false),
    (v_user, 'Ladder: Vehicle repair reserve', 3000, 'monthly', true, false),
    (v_user, 'Parrot', 10000, 'once', false, false),
    (v_user, 'Sound System', 15000, 'monthly', false, false),
    (v_user, 'WiFi', 3000, 'monthly', true, false),
    (v_user, 'XBOX Series X', 65000, 'monthly', false, false);

  -- 11 ladder rungs. The five buffer checkpoints share one 1,347 balance in
  -- ladder_contributions below, so the app shows 1,347 on each of them.
  insert into public.ladder_rungs
    (owner_id, "order", name, type, target_amount, current_amount, monthly_contribution,
     start_date, target_date, advantages, status, liquidity, category_label, colour, icon,
     linked_budget_category, notes)
  values
    (v_user, 1, 'Buffer floor', 'buffer', 5000, 1347, 5000, '2026-11-01', '2026-11-30', array['Ends the borrow-and-repay cycle', 'Covers a broken phone or a sudden trip', 'Keeps Fuliza out of ordinary weeks']::text[], 'active', 'liquid', 'Ladder: Buffer floor', '#0F8F8C', 'shield', 'Ladder: Buffer floor', 'Funded by Dad 1,500, Omar 3,000 and 500 of surplus.'),
    (v_user, 2, 'Clear Fuliza', 'debt', 5300, 0, 5300, '2026-12-01', '2026-12-06', array['Stops 25 to 30 shillings a day of daily fees', 'Frees future M-Pesa inflows', 'Removes automatic deduction from incoming money']::text[], 'active', 'liquid', 'Ladder: Clear Fuliza', '#E4572E', 'flame', 'Ladder: Clear Fuliza', 'Pay from December earnings before touching the buffer.'),
    (v_user, 3, 'Insurance-ready buffer', 'buffer', 12000, 1347, 0, '2026-12-07', '2027-01-31', array['Holds three months of premiums so cover is never lost to arrears', 'Covers the co-payment a claim leaves behind', 'Unlocks hospital cash cover at about 900 a month']::text[], 'locked', 'liquid', 'Ladder: Insurance-ready buffer', '#0F8F8C', 'heart', 'Ladder: Insurance-ready buffer', 'Buy the cash plan in January 2027.'),
    (v_user, 4, 'One month of essentials', 'buffer', 25000, 1347, 0, '2027-02-01', '2027-03-31', array['A full month of food, transport, tokens and pet costs without borrowing', 'A bad month stops being frightening', 'Buys the time to say no to bad work']::text[], 'locked', 'liquid', 'Ladder: One month of essentials', '#0F8F8C', 'calendar', 'Ladder: One month of essentials', 'Essentials run about 25,000 a month.'),
    (v_user, 5, 'Two months of essentials', 'buffer', 50000, 1347, 0, '2027-04-01', '2027-08-31', array['Survives a lost client or a slow quarter', 'Allows planned spending without guilt', 'The minimum most advisers call a real emergency fund']::text[], 'locked', 'liquid', 'Ladder: Two months of essentials', '#0F8F8C', 'layers', 'Ladder: Two months of essentials', 'The five buffer rungs share this same balance; it is not five separate pots.'),
    (v_user, 6, 'Three months of essentials', 'buffer', 75000, 1347, 0, '2027-09-01', '2028-01-31', array['Full textbook cover', 'Confidence to take a calculated risk', 'Room to absorb a family emergency without derailing the plan']::text[], 'locked', 'liquid', 'Ladder: Three months of essentials', '#0F8F8C', 'fortress', 'Ladder: Three months of essentials', 'The five buffer rungs share this same balance; it is not five separate pots.'),
    (v_user, 7, 'Business reinvestment', 'investment', 60000, 0, 5000, '2027-01-01', '2027-12-31', array['Raises income instead of rationing it', 'A capped 60,000 test with a deadline, not an open tab', 'Proves whether Explee plus Facebook can sell Veyro at a profit', 'Finding one working campaign beats a decade of reserving']::text[], 'locked', 'invested', 'Ladder: Business reinvestment', '#3B4CB8', 'briefcase', 'Ladder: Business reinvestment', 'Veyro marketing test. 60,000 over twelve months at 5,000 a month, spent on Explee campaigns and Facebook as the marketer, to prove whether veyro.co.ke can be sold to profitably. A test with a fixed budget and a deadline, not open-ended advertising: measure cost per order, orders per month and gross profit, and stop or scale at 31 December 2027 on the evidence. Approved as a dated exception to sequential rung starts.'),
    (v_user, 8, 'Tuktuk, electric, financed', 'investment', 157000, 0, 10000, '2028-02-01', '2029-04-30', array['Reaches the asset in 15 months, not 27, because you stake the deposit instead of the whole price', 'Self-liquidating: 28,000 a month in, 10,336 out to the bank', 'Electric running costs about 200 a day against 1,000 for petrol', 'Its 17,664 monthly surplus then funds the business car, pulling it two years earlier']::text[], 'locked', 'invested', 'Ladder: Tuktuk', '#E4A11B', 'car', 'Ladder: Tuktuk', 'Funds the STAKE on a financed electric tuktuk, not the whole vehicle. Target 157,000 = 126,000 deposit (30 per cent of a 420,000 unit) plus 31,000 cushion, being three instalments of 10,336. Loan: 294,000 at about 16 per cent over three years. Cash arithmetic: remit 1,200 a day over 26 days gives 31,200; less 2,500 maintenance and 700 insurance gives 28,000 operating surplus; less the 10,336 instalment leaves 17,664 a month. Conditions before signing: a driver already known and trusted, county route rules confirmed in writing, comprehensive insurance with the lender named, and the 31,000 cushion actually held.'),
    (v_user, 9, 'Vehicle repair reserve', 'reserve', 60000, 0, 3000, '2029-05-01', '2030-11-30', array['Pays for the first gearbox instead of Fuliza at 7.5 per cent a month', 'Funds major repairs only, since routine service is already deducted from every surplus', 'Held liquid so it can be spent the same week a vehicle breaks', 'Stops one breakdown from cancelling the car fund']::text[], 'locked', 'liquid', 'Ladder: Vehicle repair reserve', '#7A5AF8', 'wrench', 'Ladder: Vehicle repair reserve', 'A standing rung, not a goal: it never completes and never closes. It fills by November 2030, is spent on a major repair, and starts refilling. Sized at 60,000, about six months of combined maintenance: 2,500 a month for the electric tuktuk plus 7,000 for the business car, 9,500 in all. Covers MAJOR repairs only. Fuel and routine servicing are excluded, because both are already deducted inside each vehicle''s operating surplus. Funded from the tuktuk''s surplus at 3,000 a month from May 2029, while the car fund runs at 24,664 in parallel. Keep it in the money market fund, not a fixed deposit, because it must be reachable the week the engine lets go.'),
    (v_user, 10, 'Business car', 'investment', 800000, 0, 24664, '2029-05-01', '2031-10-31', array['Turns reserves into an earning asset instead of a parked balance', 'A used saloon at about 800,000 nets 24,000 to 33,000 a month', '30 to 40 per cent a year on capital, far above any deposit account', 'Bought cash, so no loan eats the earnings', 'Its monthly profit then funds the truck deposit']::text[], 'locked', 'invested', 'Ladder: Business car', '#B4772A', 'car', 'Ladder: Business car', 'How the 24,664 is made: remit 1,200 a day over 26 days = 31,200; less 2,500 maintenance and 700 insurance = 28,000; less the 10,336 instalment on 294,000 at 16 per cent over three years = 17,664 of tuktuk surplus; plus 10,000 of Shawn''s own money = 27,664; less 3,000 routed to the vehicle repair reserve = 24,664. Runs in parallel with the repair reserve from May 2029, so the car lands October 2031 rather than July.'),
    (v_user, 11, 'Used truck', 'investment', 400000, 0, 10000, '2031-11-01', '2034-10-31', array['Targets the deposit, not the whole truck, so the asset pays for itself', 'A used truck at 1,500,000 needs no three million reserved in cash', 'Financed from earnings, so your own capital stays liquid', 'Small test stake before any bigger commitment']::text[], 'locked', 'invested', 'Ladder: Used truck', '#E4A11B', 'truck', 'Ladder: Used truck', 'Not the full price. 400,000 is the deposit on a used 7-tonne truck of about 1,500,000, with the balance on asset finance repaid from the truck''s own earnings: roughly 33,400 a month over four years against about 45,000 net. Confirm the rate and the deposit the lender wants before committing.');

  insert into public.ladder_contributions
    (owner_id, rung_id, amount, contribution_date, source, note)
  select v_user, id, 1347, '2026-11-16', 'manual',
         'Transfer to Britam Money Market Fund, buffer leg'
    from public.ladder_rungs where owner_id = v_user and "order" = 1;

  insert into public.ladder_settings
    (owner_id, monthly_reminder, deadline_alert, behind_pace, completion_notice)
  values (v_user, true, true, true, true);

  -- 12 loans; blank export rates are null and 'one-time' is normalised to 'one_time'.
  insert into public.loans
    (owner_id, lender, principal, balance, interest_rate, installment_amount,
     next_payment_date, frequency, status)
  values
    (v_user, 'Fuliza', 5300, 5300, 1.0, 5300, '2026-12-06', 'one_time', 'active'),
    (v_user, 'Godfrey', 500, 500, 0.0, 500, '2026-12-14', 'one_time', 'active'),
    (v_user, 'M-Shwari', 2000, 2000, 0.0, 2000, '2026-12-18', 'one_time', 'active'),
    (v_user, 'Masawa', 2500, 2500, 0.0, 2500, '2026-12-14', 'one_time', 'active'),
    (v_user, 'Co-operative Bank', 3000, 0, 14.5, 3000, '2026-12-03', 'one_time', 'settled'),
    (v_user, 'Everlyne', 500, 0, null, 500, '2026-10-29', 'one_time', 'settled'),
    (v_user, 'Fuliza', 5300, 0, 1.0, 5300, '2026-11-15', 'one_time', 'settled'),
    (v_user, 'Hustler Fund', 900, 0, 0.0, 900, '2026-11-20', 'one_time', 'settled'),
    (v_user, 'Hustler Fund', 900, 0, 0.0, 900, '2026-11-20', 'one_time', 'settled'),
    (v_user, 'Hustler Fund', 900, 0, 8.0, 900, '2026-11-17', 'one_time', 'settled'),
    (v_user, 'Hustler Fund', 900, 0, 8.0, 900, '2026-11-06', 'one_time', 'settled'),
    (v_user, 'M-Shwari', 687, 0, 7.5, 687, '2026-11-12', 'one_time', 'settled');

  -- 4 receivables, all settled in the export.
  insert into public.debts_owed
    (owner_id, debtor, original_amount, balance, due_date, status, description)
  values
    (v_user, 'Dad', 1500, 0, '2026-11-20', 'settled', 'Settled on 17 Nov 2026 out of the 5,000 Dad sent. Marked settled on Shawn''s instruction; 1,500 of that 5,000 was repayment of this debt.'),
    (v_user, 'Omar', 3000, 0, '2026-11-23', 'settled', 'Settled 18 Nov 2026, paid in full. This was the 3,000 due 23 November; Omar had already paid 3,000 on 27 Oct, 3,000 on 8 Nov and 3,000 on 10 Nov.'),
    (v_user, 'Omar', 3000, 0, '2026-11-09', 'settled', 'Omar owes Ksh3,000, due Monday 9 Nov 2026'),
    (v_user, 'Jermaine', 500, 0, '2026-11-01', 'settled', 'Ksh500 sent to Jermaine on 28 Oct 2026, to be repaid by end of this week');

  insert into public.wallet_snapshots
    (owner_id, snapshot_date, mpesa_balance, mmf_balance, mshwari_balance, other_cash, total, note)
  values (v_user, '2026-11-20', 69, 1347, 0, 0, 1416,
          'Counted by Shawn on 20 Nov 2026. M-PESA 69, Britam MMF 1,347 (reserves, excluded from the wallet), M-Shwari reserves nil.');

  insert into public.reconciliations
    (owner_id, recon_date, account, expected, actual, difference, note)
  values (v_user, '2026-11-20', 'M-PESA', 5082, 69, -5013,
          'Ledger expectation from November flows: received 57,900 plus post-cutover draws 5,900 less spending 56,471 less reserves move 1,347 less principal repaid 900. Actual M-PESA cash 69. Gap of 5,013 unresolved.');
end $$;

-- Expected result: 213 transactions, 26 budgets (7 active), 11 rungs, 1 contribution,
-- 12 loans (10,300 active), 4 receivables, 1 snapshot, 1 reconciliation.
with u as (select id from auth.users where lower(email) = lower('shawnkodhe07@gmail.com'))
select
  (select count(*) from public.transactions where owner_id = u.id) as transactions,
  (select count(*) from public.budgets where owner_id = u.id) as budgets,
  (select count(*) from public.budgets where owner_id = u.id and active) as active_budgets,
  (select count(*) from public.ladder_rungs where owner_id = u.id) as rungs,
  (select sum(amount) from public.ladder_contributions where owner_id = u.id) as buffer_reserved,
  (select count(*) from public.loans where owner_id = u.id) as loans,
  (select sum(balance) from public.loans where owner_id = u.id and status = 'active') as owed_out,
  (select count(*) from public.debts_owed where owner_id = u.id) as receivables,
  (select count(*) from public.wallet_snapshots where owner_id = u.id) as snapshots,
  (select count(*) from public.reconciliations where owner_id = u.id) as reconciliations
from u;

commit;
