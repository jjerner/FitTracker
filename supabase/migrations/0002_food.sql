-- Foods cache (Open Food Facts lookups + custom foods) and food diary entries.

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('off', 'custom')),
  barcode text,
  name text not null,
  brand text,
  serving_size_g numeric,
  serving_description text,
  calories_kcal numeric not null,
  protein_g numeric not null,
  carbs_g numeric not null,
  fat_g numeric not null,
  fiber_g numeric,
  sugar_g numeric,
  sodium_mg numeric,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create unique index foods_barcode_unique on public.foods (barcode) where barcode is not null;

alter table public.foods enable row level security;

create policy "Foods are readable by any authenticated user"
  on public.foods for select
  to authenticated
  using (true);

create policy "Users can insert OFF-sourced foods"
  on public.foods for insert
  to authenticated
  with check (source = 'off' or created_by = auth.uid());

create policy "Users can update their own custom foods"
  on public.foods for update
  to authenticated
  using (created_by = auth.uid());

create table public.food_log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid not null references public.foods(id),
  logged_at timestamptz not null default now(),
  logged_date date not null default current_date,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name text not null,
  quantity numeric not null,
  quantity_unit text not null check (quantity_unit in ('g', 'serving')),
  calories_kcal numeric not null,
  protein_g numeric not null,
  carbs_g numeric not null,
  fat_g numeric not null,
  fiber_g numeric,
  created_at timestamptz not null default now()
);

create index food_log_entries_user_date on public.food_log_entries (user_id, logged_date);

alter table public.food_log_entries enable row level security;

create policy "Users can view own food log"
  on public.food_log_entries for select
  using (user_id = auth.uid());

create policy "Users can insert own food log"
  on public.food_log_entries for insert
  with check (user_id = auth.uid());

create policy "Users can update own food log"
  on public.food_log_entries for update
  using (user_id = auth.uid());

create policy "Users can delete own food log"
  on public.food_log_entries for delete
  using (user_id = auth.uid());

create table public.nutrition_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calories_kcal int not null,
  protein_g numeric not null,
  carbs_g numeric not null,
  fat_g numeric not null,
  fiber_g numeric,
  updated_at timestamptz not null default now()
);

create unique index nutrition_goals_user_unique on public.nutrition_goals (user_id);

alter table public.nutrition_goals enable row level security;

create policy "Users can view own goals"
  on public.nutrition_goals for select
  using (user_id = auth.uid());

create policy "Users can upsert own goals"
  on public.nutrition_goals for insert
  with check (user_id = auth.uid());

create policy "Users can update own goals"
  on public.nutrition_goals for update
  using (user_id = auth.uid());
