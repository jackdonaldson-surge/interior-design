-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Projects table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null default auth.uid(),
  name text not null default 'Untitled',
  color text not null default '#0071e3',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

alter table projects enable row level security;

create policy "Users see own projects"
  on projects for select using (auth.uid() = user_id);
create policy "Users insert own projects"
  on projects for insert with check (auth.uid() = user_id);
create policy "Users update own projects"
  on projects for update using (auth.uid() = user_id);
create policy "Users delete own projects"
  on projects for delete using (auth.uid() = user_id);

-- Tasks table
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null default auth.uid(),
  project_id uuid references projects on delete set null,
  title text not null default '',
  date date not null default current_date,
  estimated int not null default 0,
  elapsed int not null default 0,
  running boolean not null default false,
  timer_start timestamptz,
  completed boolean not null default false,
  completed_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table tasks enable row level security;

create policy "Users see own tasks"
  on tasks for select using (auth.uid() = user_id);
create policy "Users insert own tasks"
  on tasks for insert with check (auth.uid() = user_id);
create policy "Users update own tasks"
  on tasks for update using (auth.uid() = user_id);
create policy "Users delete own tasks"
  on tasks for delete using (auth.uid() = user_id);

-- Index for common queries
create index if not exists tasks_user_date on tasks (user_id, date);
create index if not exists tasks_user_project on tasks (user_id, project_id);
