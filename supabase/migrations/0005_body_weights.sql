-- Body weight log: one entry per user per day (re-logging a day overwrites it).

create table public.body_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_date date not null default current_date,
  weight_kg numeric not null check (weight_kg > 0),
  created_at timestamptz not null default now(),
  -- Non-partial so it works as an upsert ON CONFLICT target.
  unique (user_id, logged_date)
);

alter table public.body_weights enable row level security;

create policy "Users can manage own body weights"
  on public.body_weights for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
