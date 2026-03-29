-- Run this in the Supabase SQL Editor to set up the database

-- One row per user, stores garden state as a JSON document
create table public.gardens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  constraint gardens_user_id_unique unique (user_id)
);

-- Row Level Security: users can only access their own data
alter table public.gardens enable row level security;

create policy "Users can read own garden"
  on public.gardens for select
  using (auth.uid() = user_id);

create policy "Users can insert own garden"
  on public.gardens for insert
  with check (auth.uid() = user_id);

create policy "Users can update own garden"
  on public.gardens for update
  using (auth.uid() = user_id);
