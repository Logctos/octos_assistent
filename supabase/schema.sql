-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount numeric(12, 2) not null,
  category text not null,
  created_at timestamptz not null default now()
);

-- Fluxo de caixa: distingue receita/despesa e adiciona a subcategoria (linha do
-- extrato, ex. categoria "Cartões de Crédito" > subcategoria "Nu Bank").
-- Seguro rodar de novo em bancos que já têm a tabela `expenses` da versão anterior.
alter table expenses add column if not exists type text not null default 'expense';
alter table expenses add column if not exists subcategory text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'expenses_type_check'
  ) then
    alter table expenses add constraint expenses_type_check check (type in ('income', 'expense'));
  end if;
end $$;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'paused', 'done')),
  created_at timestamptz not null default now()
);

-- Separates projects (and, via the chat tool, calendar events) into work vs. study buckets.
-- Safe to run again on databases that already have `projects` without this column.
alter table projects add column if not exists category text;
update projects set category = 'trabalho' where category is null;
alter table projects alter column category set not null;
alter table projects drop constraint if exists projects_category_check;
alter table projects add constraint projects_category_check check (category in ('trabalho', 'estudos', 'ambas'));

create table if not exists health_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  weight_kg numeric(5, 2),
  activity_minutes integer,
  sleep_hours numeric(4, 2),
  created_at timestamptz not null default now()
);

create table if not exists google_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  connected_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Gamified study plan: each row is one scheduled study session (also mirrored as a
-- Google Calendar event, when connected). Completing a session awards xp_value XP;
-- level/streak are derived client-side from completed sessions, not stored here.
create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_label text not null,
  topic text not null,
  session_date date not null,
  duration_minutes integer not null default 45,
  xp_value integer not null default 20,
  completed boolean not null default false,
  completed_at timestamptz,
  calendar_event_link text,
  created_at timestamptz not null default now()
);

-- Researched study material per topic (principles, key concepts, web sources), generated
-- via a web-search-grounded model call and optionally seeded by a user-given base book/site.
create table if not exists study_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_label text,
  topic text not null,
  content text not null,
  sources jsonb not null default '[]'::jsonb,
  base_material text,
  created_at timestamptz not null default now()
);

-- The user's running daily journal: one entry per day they report studying or working on
-- something (via chat, voice or text), building up a "document" of everything over time.
-- The chat home page reads yesterday's entries for the "resumo de ontem" recap.
create table if not exists daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  content text not null,
  created_at timestamptz not null default now()
);

alter table expenses enable row level security;
alter table projects enable row level security;
alter table health_logs enable row level security;
alter table google_calendar_connections enable row level security;
alter table chat_messages enable row level security;
alter table study_sessions enable row level security;
alter table study_materials enable row level security;
alter table daily_summaries enable row level security;

create policy "Users can select their own expenses"
  on expenses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own expenses"
  on expenses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own expenses"
  on expenses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own expenses"
  on expenses for delete
  using (auth.uid() = user_id);

create policy "Users can select their own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can insert their own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on projects for delete
  using (auth.uid() = user_id);

create policy "Users can select their own health logs"
  on health_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own health logs"
  on health_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own health logs"
  on health_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own health logs"
  on health_logs for delete
  using (auth.uid() = user_id);

create policy "Users can select their own google calendar connection"
  on google_calendar_connections for select
  using (auth.uid() = user_id);

create policy "Users can insert their own google calendar connection"
  on google_calendar_connections for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own google calendar connection"
  on google_calendar_connections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own google calendar connection"
  on google_calendar_connections for delete
  using (auth.uid() = user_id);

create policy "Users can select their own chat messages"
  on chat_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert their own chat messages"
  on chat_messages for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own chat messages"
  on chat_messages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own chat messages"
  on chat_messages for delete
  using (auth.uid() = user_id);

create policy "Users can select their own study sessions"
  on study_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own study sessions"
  on study_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own study sessions"
  on study_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own study sessions"
  on study_sessions for delete
  using (auth.uid() = user_id);

create policy "Users can select their own study materials"
  on study_materials for select
  using (auth.uid() = user_id);

create policy "Users can insert their own study materials"
  on study_materials for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own study materials"
  on study_materials for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own study materials"
  on study_materials for delete
  using (auth.uid() = user_id);

create policy "Users can select their own daily summaries"
  on daily_summaries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own daily summaries"
  on daily_summaries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own daily summaries"
  on daily_summaries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own daily summaries"
  on daily_summaries for delete
  using (auth.uid() = user_id);
