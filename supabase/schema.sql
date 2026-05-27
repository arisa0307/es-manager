-- a.t 就活管理アプリ — Supabase SQL Editor で実行

-- 既存テーブルがある場合は migration.sql を参照

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  url text,
  desired_level text check (desired_level in ('S', 'A', 'B', 'C')),
  status text not null default '未エントリー',
  result text,
  salary text,
  next_action text,
  memo text,
  internship_name text,
  internship_location text,
  internship_memo text,
  deadline date,
  web_test_url text,
  web_test_notes text,
  login_id text,
  login_password text,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists es (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  question text not null,
  answer text,
  word_count integer,
  tags text[] default '{}',
  base_es text,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete set null,
  title text not null,
  deadline date,
  priority text not null default 'mid' check (priority in ('high', 'mid', 'low')),
  is_done boolean not null default false,
  memo text,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists company_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  type text not null check (type in ('internship', 'interview', 'other')),
  title text not null,
  schedule_status text not null default 'confirmed' check (schedule_status in ('confirmed', 'tentative', 'undecided')),
  event_date date,
  event_time text,
  event_end_time text,
  candidate_slots jsonb not null default '[]'::jsonb,
  memo text,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists general_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'other' check (type in ('career_fair', 'seminar', 'other')),
  event_date date,
  event_time text,
  location text,
  memo text,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists es_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  question text not null,
  answer text,
  word_count integer,
  tags text[] default '{}',
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists calendar_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_companies_user_id on companies(user_id);
create index if not exists idx_tasks_user_id on tasks(user_id);
create index if not exists idx_es_user_id on es(user_id);
create index if not exists idx_es_templates_user_id on es_templates(user_id);
create index if not exists idx_company_events_user_id on company_events(user_id);
create index if not exists idx_general_events_user_id on general_events(user_id);
create index if not exists idx_calendar_subscriptions_token on calendar_subscriptions(token);

create index if not exists idx_es_company_id on es(company_id);
create index if not exists idx_tasks_company_id on tasks(company_id);
create index if not exists idx_tasks_deadline on tasks(deadline);
create index if not exists idx_company_events_company_id on company_events(company_id);
create index if not exists idx_company_events_event_date on company_events(event_date);
create index if not exists idx_general_events_event_date on general_events(event_date);
create index if not exists idx_companies_status on companies(status);
create index if not exists idx_companies_deadline on companies(deadline);
create index if not exists idx_companies_desired_level on companies(desired_level);

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists companies_updated_at on companies;
create trigger companies_updated_at before update on companies
  for each row execute function update_updated_at();

drop trigger if exists es_updated_at on es;
create trigger es_updated_at before update on es
  for each row execute function update_updated_at();

drop trigger if exists tasks_updated_at on tasks;
create trigger tasks_updated_at before update on tasks
  for each row execute function update_updated_at();

drop trigger if exists company_events_updated_at on company_events;
create trigger company_events_updated_at before update on company_events
  for each row execute function update_updated_at();

drop trigger if exists general_events_updated_at on general_events;
create trigger general_events_updated_at before update on general_events
  for each row execute function update_updated_at();

drop trigger if exists es_templates_updated_at on es_templates;
create trigger es_templates_updated_at before update on es_templates
  for each row execute function update_updated_at();

drop trigger if exists calendar_subscriptions_updated_at on calendar_subscriptions;
create trigger calendar_subscriptions_updated_at before update on calendar_subscriptions
  for each row execute function update_updated_at();

alter table companies enable row level security;
alter table es enable row level security;
alter table tasks enable row level security;
alter table company_events enable row level security;
alter table general_events enable row level security;
alter table es_templates enable row level security;
alter table calendar_subscriptions enable row level security;

create policy "Users select own companies" on companies for select using (auth.uid() = user_id);
create policy "Users insert own companies" on companies for insert with check (auth.uid() = user_id);
create policy "Users update own companies" on companies for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own companies" on companies for delete using (auth.uid() = user_id);

create policy "Users select own es" on es for select using (auth.uid() = user_id);
create policy "Users insert own es" on es for insert with check (auth.uid() = user_id);
create policy "Users update own es" on es for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own es" on es for delete using (auth.uid() = user_id);

create policy "Users select own tasks" on tasks for select using (auth.uid() = user_id);
create policy "Users insert own tasks" on tasks for insert with check (auth.uid() = user_id);
create policy "Users update own tasks" on tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own tasks" on tasks for delete using (auth.uid() = user_id);

create policy "Users select own company_events" on company_events for select using (auth.uid() = user_id);
create policy "Users insert own company_events" on company_events for insert with check (auth.uid() = user_id);
create policy "Users update own company_events" on company_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own company_events" on company_events for delete using (auth.uid() = user_id);

create policy "Users select own general_events" on general_events for select using (auth.uid() = user_id);
create policy "Users insert own general_events" on general_events for insert with check (auth.uid() = user_id);
create policy "Users update own general_events" on general_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own general_events" on general_events for delete using (auth.uid() = user_id);

create policy "Users select own es_templates" on es_templates for select using (auth.uid() = user_id);
create policy "Users insert own es_templates" on es_templates for insert with check (auth.uid() = user_id);
create policy "Users update own es_templates" on es_templates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own es_templates" on es_templates for delete using (auth.uid() = user_id);

create policy "Users select own calendar_subscriptions" on calendar_subscriptions for select using (auth.uid() = user_id);
create policy "Users insert own calendar_subscriptions" on calendar_subscriptions for insert with check (auth.uid() = user_id);
create policy "Users update own calendar_subscriptions" on calendar_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own calendar_subscriptions" on calendar_subscriptions for delete using (auth.uid() = user_id);
