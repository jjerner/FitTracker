-- Custom foods were readable by every user (select policy was `using (true)`).
-- Shared rows (Open Food Facts cache, Livsmedelsverket) have no owner and stay readable by all;
-- rows with an owner are only visible to that owner, plus anyone who already logged the food or
-- saved it in a meal. Before this, scanning a barcode could hand you someone else's custom food,
-- and those diary entries and saved meals must keep working.

drop policy "Foods are readable by any authenticated user" on public.foods;

create index food_log_entries_food_user on public.food_log_entries (food_id, user_id);
create index saved_meal_items_food_idx on public.saved_meal_items (food_id);

create policy "Users can read shared foods, their own, and foods they logged"
  on public.foods for select
  to authenticated
  using (
    created_by is null
    or created_by = auth.uid()
    or exists (
      select 1 from public.food_log_entries e
      where e.food_id = foods.id and e.user_id = auth.uid()
    )
    or exists (
      select 1 from public.saved_meal_items i
      join public.saved_meals m on m.id = i.meal_id
      where i.food_id = foods.id and m.user_id = auth.uid()
    )
  );

-- Any user could insert an ownerless OFF row with made-up nutrition, and everyone scanning that
-- barcode got it. Each user now keeps their own copy of the OFF foods they pick, so a bad row
-- only affects the user who wrote it. Existing ownerless OFF rows stay readable (diary entries
-- point at them) but nobody can add new ones.

drop policy "Users can insert OFF-sourced foods" on public.foods;

create policy "Users can insert their own OFF and custom foods"
  on public.foods for insert
  to authenticated
  with check (source in ('off', 'custom') and created_by = auth.uid());

-- One row per barcode per owner instead of per barcode overall, so another user's private
-- custom food no longer blocks the barcode. A plain (non-partial) constraint so it can be an
-- upsert target; NULL barcodes and the old ownerless rows don't collide.
alter table public.foods drop constraint foods_barcode_key;
alter table public.foods add constraint foods_barcode_owner_key unique (barcode, created_by);
