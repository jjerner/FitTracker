-- Rest time per exercise in a routine (seconds). Null = use the app's default rest.
-- RLS unchanged: the table's existing "own templates" policy covers the new column.
alter table public.workout_template_exercises add column rest_seconds int check (rest_seconds > 0 and rest_seconds <= 600);
