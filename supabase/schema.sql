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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists company_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  type text not null check (type in ('internship', 'interview', 'other')),
  title text not null,
  event_date date not null,
  memo text,
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_es_company_id on es(company_id);
create index if not exists idx_tasks_company_id on tasks(company_id);
create index if not exists idx_tasks_deadline on tasks(deadline);
create index if not exists idx_company_events_company_id on company_events(company_id);
create index if not exists idx_company_events_event_date on company_events(event_date);
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

drop trigger if exists es_templates_updated_at on es_templates;
create trigger es_templates_updated_at before update on es_templates
  for each row execute function update_updated_at();

alter table companies enable row level security;
alter table es enable row level security;
alter table tasks enable row level security;
alter table company_events enable row level security;
alter table es_templates enable row level security;

create policy "Allow all on companies" on companies for all using (true) with check (true);
create policy "Allow all on es" on es for all using (true) with check (true);
create policy "Allow all on tasks" on tasks for all using (true) with check (true);
create policy "Allow all on company_events" on company_events for all using (true) with check (true);
create policy "Allow all on es_templates" on es_templates for all using (true) with check (true);
