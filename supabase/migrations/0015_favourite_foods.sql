-- Foods the user has starred; shown first in food search. Each user only sees their own.

create table public.favourite_foods (
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, food_id)
);

alter table public.favourite_foods enable row level security;

create policy "Users can manage own favourite foods"
  on public.favourite_foods for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
