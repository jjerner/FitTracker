-- Warm-up sets (3.4). Every existing set becomes 'normal', so old history does not change.
-- The workout_log_sets RLS policy (0004) covers the new column; no policy change.

alter table public.workout_log_sets
  add column set_type text not null default 'normal' check (set_type in ('normal', 'warmup'));
