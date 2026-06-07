-- ============================================================
-- Gym Tracker — Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Profiles (auto-created on signup via trigger below)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  created_at timestamptz default now()
);

-- Workout sessions
create table if not exists public.workout_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  day_number integer not null,
  date date not null,
  completed boolean default false,
  created_at timestamptz default now()
);

-- Exercise logs (individual sets)
create table if not exists public.exercise_logs (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.workout_sessions(id) on delete cascade not null,
  exercise_name text not null,
  set_number integer not null,
  weight_kg numeric(6, 2),
  reps integer,
  completed boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.exercise_logs enable row level security;

-- Profiles
create policy "profiles: select own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- Workout sessions
create policy "sessions: select own" on public.workout_sessions
  for select using (auth.uid() = user_id);
create policy "sessions: insert own" on public.workout_sessions
  for insert with check (auth.uid() = user_id);
create policy "sessions: update own" on public.workout_sessions
  for update using (auth.uid() = user_id);

-- Exercise logs (via session ownership)
create policy "logs: select own" on public.exercise_logs
  for select using (
    auth.uid() = (select user_id from public.workout_sessions where id = session_id)
  );
create policy "logs: insert own" on public.exercise_logs
  for insert with check (
    auth.uid() = (select user_id from public.workout_sessions where id = session_id)
  );
create policy "logs: update own" on public.exercise_logs
  for update using (
    auth.uid() = (select user_id from public.workout_sessions where id = session_id)
  );

-- ============================================================
-- Auto-create profile on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
