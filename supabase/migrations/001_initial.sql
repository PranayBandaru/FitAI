-- ─── Enable UUID extension ────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  height_cm  numeric(5, 1) not null default 170,
  weight_kg  numeric(5, 2) not null default 70,
  age        int           not null default 25,
  sex        text          not null default 'male'
               check (sex in ('male', 'female', 'other')),
  activity_level text not null default 'moderately_active'
               check (activity_level in (
                 'sedentary', 'lightly_active', 'moderately_active',
                 'very_active', 'extra_active'
               )),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = user_id);

-- ─── Food Logs ────────────────────────────────────────────────────────────────
create table if not exists food_logs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  logged_at     timestamptz not null default now(),
  meal_type     text not null default 'snack'
                  check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name     text not null,
  quantity      numeric(8, 2) not null default 1,
  unit          text not null default 'serving',
  calories_kcal numeric(8, 2) not null default 0,
  protein_g     numeric(8, 2) not null default 0,
  carbs_g       numeric(8, 2) not null default 0,
  fat_g         numeric(8, 2) not null default 0,
  source        text not null default 'usda'
                  check (source in ('usda', 'llm_estimate')),
  raw_message   text not null default ''
);

create index on food_logs (user_id, logged_at);

alter table food_logs enable row level security;

create policy "Users can view own food logs"
  on food_logs for select using (auth.uid() = user_id);

create policy "Users can insert own food logs"
  on food_logs for insert with check (auth.uid() = user_id);

create policy "Users can update own food logs"
  on food_logs for update using (auth.uid() = user_id);

create policy "Users can delete own food logs"
  on food_logs for delete using (auth.uid() = user_id);

-- ─── Goals ────────────────────────────────────────────────────────────────────
create table if not exists goals (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid unique references auth.users (id) on delete cascade,
  target_weight_kg  numeric(5, 2) not null,
  target_date       date not null,
  created_at        timestamptz not null default now()
);

alter table goals enable row level security;

create policy "Users can view own goals"
  on goals for select using (auth.uid() = user_id);

create policy "Users can insert own goals"
  on goals for insert with check (auth.uid() = user_id);

create policy "Users can update own goals"
  on goals for update using (auth.uid() = user_id);

-- ─── Chat Sessions ────────────────────────────────────────────────────────────
create table if not exists chat_sessions (
  id       uuid primary key default uuid_generate_v4(),
  user_id  uuid not null references auth.users (id) on delete cascade,
  date     date not null,
  messages jsonb not null default '[]'::jsonb,
  unique (user_id, date)
);

alter table chat_sessions enable row level security;

create policy "Users can view own chat sessions"
  on chat_sessions for select using (auth.uid() = user_id);

create policy "Users can insert own chat sessions"
  on chat_sessions for insert with check (auth.uid() = user_id);

create policy "Users can update own chat sessions"
  on chat_sessions for update using (auth.uid() = user_id);
