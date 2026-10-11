-- Custom foods were readable by every user (select policy was `using (true)`).
-- Shared rows (Open Food Facts cache, Livsmedelsverket) have no owner and stay readable by all;
-- rows with an owner are only visible to that owner.

drop policy "Foods are readable by any authenticated user" on public.foods;

create policy "Users can read shared foods and their own"
  on public.foods for select
  to authenticated
  using (created_by is null or created_by = auth.uid());

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
