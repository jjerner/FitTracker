-- Drop sets (3.4b): each drop step is its own row with set_type 'drop'. Existing rows stay valid.
alter table public.workout_log_sets drop constraint workout_log_sets_set_type_check;
alter table public.workout_log_sets add constraint workout_log_sets_set_type_check
  check (set_type in ('normal', 'warmup', 'drop'));
