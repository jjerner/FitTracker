-- Supersets (3.7): a row with superset_with_next is paired with the row right below it. Existing rows stay unpaired.
alter table public.workout_template_exercises add column superset_with_next boolean not null default false;
alter table public.workout_log_exercises add column superset_with_next boolean not null default false;
