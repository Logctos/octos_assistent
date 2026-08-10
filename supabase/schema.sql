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
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projects_category_check'
  ) then
    alter table projects add constraint projects_category_check check (category in ('trabalho', 'estudos'));
  end if;
end $$;

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

alter table expenses enable row level security;
alter table projects enable row level security;
alter table google_calendar_connections enable row level security;
alter table chat_messages enable row level security;

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
