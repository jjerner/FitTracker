-- Custom foods were readable by every user. Now you see shared foods (OFF and SLV rows have
-- no owner) plus your own custom foods only.
drop policy "Foods are readable by any authenticated user" on public.foods;

create policy "Foods are readable if shared or your own"
  on public.foods for select
  to authenticated
  using (created_by is null or created_by = auth.uid());
