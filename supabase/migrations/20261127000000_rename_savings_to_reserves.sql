-- Rename the financial "savings" terminology to "reserves".
-- Category values are free text, so existing rows must be carried across or
-- their budgets, filters and labels would stop matching the renamed option.

update public.transactions
   set category = 'reserves'
 where lower(trim(category)) = 'savings';

update public.budgets
   set category = 'reserves'
 where lower(trim(category)) = 'savings';

update public.ladder_rungs
   set linked_budget_category = 'reserves'
 where lower(trim(linked_budget_category)) = 'savings';
