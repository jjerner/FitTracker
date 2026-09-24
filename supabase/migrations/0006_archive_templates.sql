-- Archived templates are hidden from the main list but kept (unlike delete).

alter table public.workout_templates add column archived_at timestamptz;
