-- One row per user per day with the day's totals, so the Progress tab reads at most one row
-- per day instead of every diary entry (Supabase returns at most 1000 rows per request).
-- security_invoker makes the view obey the food_log_entries row level security: you only
-- ever see your own days.
create view public.daily_nutrition
with (security_invoker = true) as
select
  user_id,
  logged_date,
  sum(calories_kcal) as calories_kcal,
  sum(protein_g) as protein_g,
  sum(carbs_g) as carbs_g,
  sum(fat_g) as fat_g
from public.food_log_entries
group by user_id, logged_date;

grant select on public.daily_nutrition to authenticated;
