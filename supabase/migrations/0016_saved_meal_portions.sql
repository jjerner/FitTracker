-- Recipes: a saved meal that makes several portions (e.g. pancake batter = 12).
-- Normal saved meals keep portions = 1 and log as before.

alter table public.saved_meals
  add column portions numeric not null default 1 check (portions > 0 and portions <= 1000);
