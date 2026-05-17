-- 旧スキーマからの移行用（既にテーブルがある場合のみ実行）

alter table companies add column if not exists url text;
alter table companies add column if not exists desired_level text;
alter table companies add column if not exists result text;
alter table companies add column if not exists salary text;
alter table companies add column if not exists next_action text;
alter table companies add column if not exists deadline date;
alter table companies drop column if exists notes;

alter table es rename column char_limit to word_count;
alter table es add column if not exists tags text[] default '{}';
alter table es add column if not exists base_es text;

alter table tasks rename column due_date to deadline;
alter table tasks rename column completed to is_done;
alter table tasks rename column description to memo;
-- priority: medium → mid
update tasks set priority = 'mid' where priority = 'medium';
alter table tasks drop constraint if exists tasks_priority_check;
alter table tasks add constraint tasks_priority_check check (priority in ('high', 'mid', 'low'));

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
create policy "Allow all on es_templates" on es_templates for all using (true) with check (true);
