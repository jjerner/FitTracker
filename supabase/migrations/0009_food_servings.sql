-- Personal serving sizes: any user can add their own named servings (e.g. "1 slice = 30 g")
-- to any food. Only the user who made them can see or change them.

create table public.food_servings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete cascade,
  name text not null,
  grams numeric not null check (grams > 0),
  created_at timestamptz not null default now()
);

create index food_servings_user_food on public.food_servings (user_id, food_id);

alter table public.food_servings enable row level security;

create policy "Users can view own servings"
  on public.food_servings for select
  using (user_id = auth.uid());

create policy "Users can insert own servings"
  on public.food_servings for insert
  with check (user_id = auth.uid());

create policy "Users can update own servings"
  on public.food_servings for update
  using (user_id = auth.uid());

create policy "Users can delete own servings"
  on public.food_servings for delete
  using (user_id = auth.uid());

-- Which serving a diary entry was logged in (grams per serving), so editing it later
-- picks the same one. Null for entries logged in grams and for older entries, which
-- used the food's own serving size.
alter table public.food_log_entries add column serving_g numeric;
