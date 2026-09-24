-- Exercise catalog, workout templates, and logged workout sessions.

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('strength', 'cardio')),
  muscle_group text,
  equipment text,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

create policy "Users can view shared and own exercises"
  on public.exercises for select
  to authenticated
  using (created_by is null or created_by = auth.uid());

create policy "Users can insert own custom exercises"
  on public.exercises for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Users can update own custom exercises"
  on public.exercises for update
  to authenticated
  using (created_by = auth.uid());

create policy "Users can delete own custom exercises"
  on public.exercises for delete
  to authenticated
  using (created_by = auth.uid());

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_templates_user on public.workout_templates (user_id);

alter table public.workout_templates enable row level security;

create policy "Users can manage own templates"
  on public.workout_templates for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  position int not null,
  target_sets int,
  target_reps int,
  target_weight_kg numeric
);

create index workout_template_exercises_template on public.workout_template_exercises (template_id, position);

alter table public.workout_template_exercises enable row level security;

create policy "Users can manage exercises in own templates"
  on public.workout_template_exercises for all
  using (exists (
    select 1 from public.workout_templates t
    where t.id = template_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.workout_templates t
    where t.id = template_id and t.user_id = auth.uid()
  ));

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid references public.workout_templates(id) on delete set null,
  name text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text
);

create index workout_logs_user_started on public.workout_logs (user_id, started_at desc);

alter table public.workout_logs enable row level security;

create policy "Users can manage own workout logs"
  on public.workout_logs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table public.workout_log_exercises (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references public.workout_logs(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  position int not null
);

create index workout_log_exercises_log on public.workout_log_exercises (log_id, position);
create index workout_log_exercises_exercise on public.workout_log_exercises (exercise_id);

alter table public.workout_log_exercises enable row level security;

create policy "Users can manage exercises in own logs"
  on public.workout_log_exercises for all
  using (exists (
    select 1 from public.workout_logs l
    where l.id = log_id and l.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.workout_logs l
    where l.id = log_id and l.user_id = auth.uid()
  ));

create table public.workout_log_sets (
  id uuid primary key default gen_random_uuid(),
  log_exercise_id uuid not null references public.workout_log_exercises(id) on delete cascade,
  set_number int not null,
  weight_kg numeric,
  reps int,
  duration_s int,
  distance_m numeric,
  completed_at timestamptz not null default now()
);

create index workout_log_sets_log_exercise on public.workout_log_sets (log_exercise_id, set_number);

alter table public.workout_log_sets enable row level security;

create policy "Users can manage sets in own logs"
  on public.workout_log_sets for all
  using (exists (
    select 1 from public.workout_log_exercises e
    join public.workout_logs l on l.id = e.log_id
    where e.id = log_exercise_id and l.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.workout_log_exercises e
    join public.workout_logs l on l.id = e.log_id
    where e.id = log_exercise_id and l.user_id = auth.uid()
  ));

-- Seed the shared catalog (created_by = null).
insert into public.exercises (name, category, muscle_group, equipment) values
  ('Bench Press', 'strength', 'chest', 'barbell'),
  ('Incline Bench Press', 'strength', 'chest', 'barbell'),
  ('Dumbbell Bench Press', 'strength', 'chest', 'dumbbell'),
  ('Push-up', 'strength', 'chest', 'bodyweight'),
  ('Chest Fly', 'strength', 'chest', 'cable'),
  ('Back Squat', 'strength', 'legs', 'barbell'),
  ('Front Squat', 'strength', 'legs', 'barbell'),
  ('Leg Press', 'strength', 'legs', 'machine'),
  ('Lunge', 'strength', 'legs', 'dumbbell'),
  ('Romanian Deadlift', 'strength', 'legs', 'barbell'),
  ('Leg Curl', 'strength', 'legs', 'machine'),
  ('Leg Extension', 'strength', 'legs', 'machine'),
  ('Calf Raise', 'strength', 'legs', 'machine'),
  ('Deadlift', 'strength', 'back', 'barbell'),
  ('Pull-up', 'strength', 'back', 'bodyweight'),
  ('Lat Pulldown', 'strength', 'back', 'cable'),
  ('Barbell Row', 'strength', 'back', 'barbell'),
  ('Dumbbell Row', 'strength', 'back', 'dumbbell'),
  ('Seated Cable Row', 'strength', 'back', 'cable'),
  ('Overhead Press', 'strength', 'shoulders', 'barbell'),
  ('Dumbbell Shoulder Press', 'strength', 'shoulders', 'dumbbell'),
  ('Lateral Raise', 'strength', 'shoulders', 'dumbbell'),
  ('Face Pull', 'strength', 'shoulders', 'cable'),
  ('Barbell Curl', 'strength', 'arms', 'barbell'),
  ('Dumbbell Curl', 'strength', 'arms', 'dumbbell'),
  ('Tricep Pushdown', 'strength', 'arms', 'cable'),
  ('Skull Crusher', 'strength', 'arms', 'barbell'),
  ('Dip', 'strength', 'arms', 'bodyweight'),
  ('Plank', 'strength', 'core', 'bodyweight'),
  ('Hanging Leg Raise', 'strength', 'core', 'bodyweight'),
  ('Running', 'cardio', null, null),
  ('Cycling', 'cardio', null, null),
  ('Rowing', 'cardio', null, 'machine'),
  ('Walking', 'cardio', null, null);
