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

-- The old insert check let OFF rows carry any created_by, so a user could plant a food that
-- shows up as someone else's own. OFF rows must now be ownerless and custom rows the caller's.

drop policy "Users can insert OFF-sourced foods" on public.foods;

create policy "Users can insert OFF foods and their own custom foods"
  on public.foods for insert
  to authenticated
  with check (
    (source = 'off' and created_by is null)
    or (source = 'custom' and created_by = auth.uid())
  );
