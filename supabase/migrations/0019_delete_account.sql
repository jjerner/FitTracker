-- 5.7: let a signed-in user delete their own account and all their data.
--
-- RUN THIS READ-ONLY CHECK FIRST (it changes nothing). It counts other users' rows that point
-- at someone else's custom food or exercise: the first three would block a deletion, the last
-- four would be deleted along with the owner without warning. All counts should be 0. If any
-- is above 0, stop and tell us before running the rest of this file.
--
-- select 'food_log' as t, count(*) from public.food_log_entries e
--   join public.foods f on f.id = e.food_id
--   where f.created_by is not null and f.created_by <> e.user_id
-- union all
-- select 'workout_log', count(*) from public.workout_log_exercises le
--   join public.workout_logs l on l.id = le.log_id
--   join public.exercises x on x.id = le.exercise_id
--   where x.created_by is not null and x.created_by <> l.user_id
-- union all
-- select 'template', count(*) from public.workout_template_exercises te
--   join public.workout_templates t on t.id = te.template_id
--   join public.exercises x on x.id = te.exercise_id
--   where x.created_by is not null and x.created_by <> t.user_id
-- union all
-- select 'food_servings', count(*) from public.food_servings s
--   join public.foods f on f.id = s.food_id
--   where f.created_by is not null and f.created_by <> s.user_id
-- union all
-- select 'favourite_foods', count(*) from public.favourite_foods ff
--   join public.foods f on f.id = ff.food_id
--   where f.created_by is not null and f.created_by <> ff.user_id
-- union all
-- select 'saved_meal_items', count(*) from public.saved_meal_items i
--   join public.saved_meals m on m.id = i.meal_id
--   join public.foods f on f.id = i.food_id
--   where f.created_by is not null and f.created_by <> m.user_id
-- union all
-- select 'tracked_exercises', count(*) from public.tracked_exercises tx
--   join public.exercises x on x.id = tx.exercise_id
--   where x.created_by is not null and x.created_by <> tx.user_id;

-- Custom foods go with their owner (the old FK had no ON DELETE and blocked account deletion).
alter table public.foods
  drop constraint foods_created_by_fkey,
  add constraint foods_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete cascade;

-- Deletes the caller only (auth.uid()). One transaction: all or nothing.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  -- These point at the user's own foods/exercises with no ON DELETE, so they must go before
  -- the cascade from auth.users reaches foods and exercises. Their child rows cascade.
  delete from public.food_log_entries where user_id = auth.uid();
  delete from public.workout_templates where user_id = auth.uid();
  delete from public.workout_logs where user_id = auth.uid();
  -- Everything else cascades from auth.users.
  delete from auth.users where id = auth.uid();
end
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
