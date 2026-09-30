-- 旧スキーマからの移行用（既にテーブルがある場合のみ実行）

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

alter table companies add column if not exists url text;
alter table companies add column if not exists desired_level text;
alter table companies drop constraint if exists companies_desired_level_check;
alter table companies add constraint companies_desired_level_check
  check (desired_level in ('S', 'A', 'B', 'C', 'D', 'ワンチャン枠', '多様性'));
alter table companies add column if not exists result text;
alter table companies add column if not exists salary text;
alter table companies add column if not exists next_action text;
alter table companies add column if not exists memo text;
alter table companies add column if not exists internship_name text;
alter table companies add column if not exists internship_location text;
alter table companies add column if not exists internship_memo text;
alter table companies add column if not exists deadline date;
alter table companies add column if not exists web_test_url text;
alter table companies add column if not exists web_test_notes text;
alter table companies add column if not exists login_id text;
alter table companies add column if not exists login_password text;
alter table company_events add column if not exists schedule_status text not null default 'confirmed';
alter table company_events add column if not exists event_end_time text;
alter table company_events add column if not exists candidate_slots jsonb not null default '[]'::jsonb;
alter table company_events add column if not exists event_time text;
alter table company_events alter column event_date drop not null;
update company_events set schedule_status = 'confirmed' where schedule_status is null;
alter table company_events drop constraint if exists company_events_schedule_status_check;
alter table company_events add constraint company_events_schedule_status_check
  check (schedule_status in ('confirmed', 'tentative', 'undecided'));
alter table general_events add column if not exists event_time text;
alter table general_events add column if not exists event_end_time text;
alter table general_events alter column event_date drop not null;
alter table companies drop column if exists notes;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'es'
      and column_name = 'char_limit'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'es'
      and column_name = 'word_count'
  ) then
    alter table es rename column char_limit to word_count;
  end if;
end;
$$;
alter table es add column if not exists word_count integer;
alter table es add column if not exists tags text[] default '{}';
alter table es add column if not exists base_es text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'due_date'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'deadline'
  ) then
    alter table tasks rename column due_date to deadline;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'completed'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'is_done'
  ) then
    alter table tasks rename column completed to is_done;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'description'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'memo'
  ) then
    alter table tasks rename column description to memo;
  end if;
end;
$$;
alter table tasks add column if not exists deadline date;
alter table tasks add column if not exists is_done boolean not null default false;
alter table tasks add column if not exists memo text;
-- カレンダー表示の制御: true=常に出す / false=出さない / null=est_pomos>=1のときだけ出す
alter table tasks add column if not exists show_on_calendar boolean;
-- priority: medium → mid
update tasks set priority = 'mid' where priority = 'medium';
alter table tasks drop constraint if exists tasks_priority_check;
alter table tasks add constraint tasks_priority_check check (priority in ('high', 'mid', 'low'));

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_events_company_id on company_events(company_id);
create index if not exists idx_company_events_event_date on company_events(event_date);

drop trigger if exists company_events_updated_at on company_events;
create trigger company_events_updated_at before update on company_events
  for each row execute function update_updated_at();

alter table company_events enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'company_events'
      and policyname = 'Allow all on company_events'
  ) then
    create policy "Allow all on company_events" on company_events for all using (true) with check (true);
  end if;
end;
$$;

create table if not exists calendar_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_calendar_subscriptions_token on calendar_subscriptions(token);

drop trigger if exists calendar_subscriptions_updated_at on calendar_subscriptions;
create trigger calendar_subscriptions_updated_at before update on calendar_subscriptions
  for each row execute function update_updated_at();

alter table calendar_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'calendar_subscriptions'
      and policyname = 'Users select own calendar_subscriptions'
  ) then
    create policy "Users select own calendar_subscriptions"
      on calendar_subscriptions for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'calendar_subscriptions'
      and policyname = 'Users insert own calendar_subscriptions'
  ) then
    create policy "Users insert own calendar_subscriptions"
      on calendar_subscriptions for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'calendar_subscriptions'
      and policyname = 'Users update own calendar_subscriptions'
  ) then
    create policy "Users update own calendar_subscriptions"
      on calendar_subscriptions for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'calendar_subscriptions'
      and policyname = 'Users delete own calendar_subscriptions'
  ) then
    create policy "Users delete own calendar_subscriptions"
      on calendar_subscriptions for delete
      using (auth.uid() = user_id);
  end if;
end;
$$;

create table if not exists general_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'other' check (type in ('career_fair', 'seminar', 'other')),
  event_date date,
  location text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_general_events_event_date on general_events(event_date);

drop trigger if exists general_events_updated_at on general_events;
create trigger general_events_updated_at before update on general_events
  for each row execute function update_updated_at();

alter table general_events enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'general_events'
      and policyname = 'Allow all on general_events'
  ) then
    create policy "Allow all on general_events" on general_events for all using (true) with check (true);
  end if;
end;
$$;

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

alter table es_templates enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'es_templates'
      and policyname = 'Allow all on es_templates'
  ) then
    create policy "Allow all on es_templates" on es_templates for all using (true) with check (true);
  end if;
end;
$$;
