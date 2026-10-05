-- Quick add: a diary entry without a food (just a name and numbers).
alter table public.food_log_entries alter column food_id drop not null;

-- Saved meals: a named group of foods that can be logged in one tap.
create table public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.saved_meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.saved_meals(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete cascade,
  quantity numeric not null check (quantity > 0),
  quantity_unit text not null check (quantity_unit in ('g', 'serving')),
  serving_g numeric,
  position int not null default 0
);

create index saved_meals_user_idx on public.saved_meals (user_id);
create index saved_meal_items_meal_idx on public.saved_meal_items (meal_id);

alter table public.saved_meals enable row level security;
alter table public.saved_meal_items enable row level security;

create policy "Users can manage own saved meals"
  on public.saved_meals for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can manage items of own saved meals"
  on public.saved_meal_items for all
  using (exists (select 1 from public.saved_meals m where m.id = meal_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.saved_meals m where m.id = meal_id and m.user_id = auth.uid()));
