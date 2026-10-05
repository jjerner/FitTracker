-- Exercises the user follows on the Progress tab.

create table public.tracked_exercises (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

alter table public.tracked_exercises enable row level security;

create policy "Users can manage own tracked exercises"
  on public.tracked_exercises for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
