-- 3.3: one sticky note per user per exercise ("Seat at 4"), shown in every workout.
create table public.exercise_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  note text not null check (char_length(note) between 1 and 200),
  primary key (user_id, exercise_id)
);

alter table public.exercise_notes enable row level security;

create policy "Users can manage own exercise notes"
  on public.exercise_notes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
