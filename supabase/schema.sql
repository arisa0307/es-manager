-- a.t 就活管理アプリ — データベース定義
--
-- 本番の Supabase と同じ構成（2026-11-22 時点）。新しい Supabase プロジェクトの
-- SQL Editor で一度だけ実行すると、テーブル・RLS・ストレージがそろう。
--
-- 方針: すべてのテーブルに user_id を持たせ、RLS で
--       「auth.uid() = user_id の行だけを読み書きできる」ようにする。
--       ログインしていない外部からのアクセス（カレンダー購読など）は
--       サーバー側の API ルートだけが service_role キーで処理する。

-- ------------------------------------------------------------
-- 共通: updated_at の自動更新
-- ------------------------------------------------------------
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql
set search_path = '';

-- ------------------------------------------------------------
-- テーブル
-- ------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  url text,
  desired_level text check (desired_level in ('S', 'A', 'B', 'C', 'D', 'ワンチャン枠', '多様性', '練習用')),
  status text not null default '未エントリー',
  result text,
  salary text,
  next_action text,
  deadline date,
  memo text,
  internship_name text,
  internship_location text,
  internship_memo text,
  web_test_url text,
  web_test_notes text,
  login_id text,
  login_password text,
  progress_note text,
  interview_prep text,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.es_submissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null default 'ES' check (kind in ('ES', 'アンケート')),
  phase text not null default '本選考' check (phase in ('インターン', '本選考', 'その他')),
  title text,
  result text check (result is null or result in ('結果待ち', '通過', '不通過')),
  submitted_on date,
  file_path text,
  file_name text,
  memo text,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.es (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  submission_id uuid references public.es_submissions(id) on delete cascade,
  question text not null,
  answer text,
  word_count integer,
  tags text[] default '{}',
  base_es text,
  result text,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.es_templates (
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

-- ES を書くときの自分用ルール集（作成者本人だけが使う機能）
create table if not exists public.es_rules (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  rule text not null,
  detail text,
  source text,
  priority integer not null default 3,
  active boolean not null default true,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  -- 本番では、作成者本人の user_id だけを許す CHECK 制約を付けている:
  -- constraint es_rules_owner_only check (user_id = '<自分の User UID>')
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  parent_task_id uuid references public.tasks(id) on delete cascade,
  title text not null,
  deadline date,
  priority text not null default 'mid' check (priority in ('high', 'mid', 'low')),
  is_done boolean not null default false,
  is_must boolean default false,
  memo text,
  result text,
  stage text check (stage is null or stage in ('適性試験', 'GD', '面接')),
  kind text default 'next' check (kind in ('next', 'waiting', 'someday')),
  category text default 'shukatsu' check (category in ('shukatsu', 'fe', 'jisshu', 'other')),
  est_pomos integer default 1 check (est_pomos >= 0),
  plan_date date,
  plan_order integer,
  waiting_on text,
  -- カレンダー表示: true=常に出す / false=出さない / null=est_pomos>=1のときだけ
  show_on_calendar boolean,
  deleted_at timestamptz,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null check (type in ('info_session', 'internship', 'es', 'web_test', 'gd', 'interview', 'other')),
  title text not null,
  schedule_status text not null default 'confirmed' check (schedule_status in ('confirmed', 'tentative', 'undecided')),
  interview_round text check (interview_round is null or interview_round in ('一次面接', '二次面接', '三次面接', '最終面接', 'AI面接')),
  event_date date,
  event_time text,
  event_end_time text,
  candidate_slots jsonb not null default '[]'::jsonb,
  memo text,
  result text,
  report text,
  deleted_at timestamptz,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.general_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'other' check (type in ('career_fair', 'seminar', 'other')),
  event_date date,
  event_time text,
  event_end_time text,
  location text,
  memo text,
  deleted_at timestamptz,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.advice_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  received_on date,
  source_type text,
  source_name text,
  topic text,
  title text,
  content text not null,
  my_take text,
  applied_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  kind text default 'focus' check (kind in ('focus', 'short_break', 'long_break')),
  completed boolean default false,
  note text,
  created_at timestamptz default now()
);

create table if not exists public.health_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  weight_kg numeric,
  intake_kcal numeric,
  active_kcal numeric,
  steps integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, log_date)
);

-- /api/health が受け取った生のリクエスト本文（動作確認用のログ）
create table if not exists public.health_log_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  received_at timestamptz not null default now(),
  log_date date,
  body jsonb
);

-- 外部カレンダー購読用のトークン（1ユーザー1つ）
create table if not exists public.calendar_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 利用者ごとの機能設定（個人向け機能のオン／オフ）。キーがなければアプリ側の既定値（オフ）
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_settings_features_is_object check (jsonb_typeof(features) = 'object')
);

-- ------------------------------------------------------------
-- インデックス
-- ------------------------------------------------------------
create index if not exists idx_companies_user_id on public.companies(user_id);
create index if not exists idx_companies_status on public.companies(status);
create index if not exists idx_companies_deadline on public.companies(deadline);
create index if not exists idx_companies_desired_level on public.companies(desired_level);

create index if not exists idx_es_user_id on public.es(user_id);
create index if not exists idx_es_company_id on public.es(company_id);
create index if not exists idx_es_submission on public.es(submission_id);
create index if not exists idx_es_submissions_user on public.es_submissions(user_id);
create index if not exists idx_es_submissions_company on public.es_submissions(company_id);
create index if not exists idx_es_templates_user_id on public.es_templates(user_id);
create index if not exists es_rules_section_idx on public.es_rules(user_id, section, active);

create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_company_id on public.tasks(company_id);
create index if not exists idx_tasks_deadline on public.tasks(deadline);
create index if not exists tasks_user_plan_idx on public.tasks(user_id, plan_date, plan_order);
create index if not exists tasks_parent_idx on public.tasks(parent_task_id);
create index if not exists tasks_active_idx on public.tasks(user_id) where deleted_at is null;

create index if not exists idx_company_events_user_id on public.company_events(user_id);
create index if not exists idx_company_events_company_id on public.company_events(company_id);
create index if not exists idx_company_events_event_date on public.company_events(event_date);
create index if not exists company_events_active_idx on public.company_events(user_id) where deleted_at is null;
-- 同じ企業・日付・時刻の予定を2件作らせない（時刻ありのみ・ゴミ箱は除外）
create unique index if not exists company_events_no_dup
  on public.company_events(user_id, company_id, event_date, event_time)
  where deleted_at is null and event_time is not null;

create index if not exists idx_general_events_user_id on public.general_events(user_id);
create index if not exists idx_general_events_event_date on public.general_events(event_date);
create index if not exists general_events_active_idx on public.general_events(user_id) where deleted_at is null;
create unique index if not exists general_events_no_dup
  on public.general_events(user_id, event_date, event_time, title)
  where deleted_at is null and event_time is not null;

create index if not exists advice_notes_user_idx on public.advice_notes(user_id, received_on desc);
create index if not exists pomodoro_sessions_user_started_idx on public.pomodoro_sessions(user_id, started_at);
create index if not exists health_log_requests_user_time_idx on public.health_log_requests(user_id, received_at desc);

-- ------------------------------------------------------------
-- updated_at トリガー
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['companies', 'es', 'es_submissions', 'es_templates', 'tasks',
                           'company_events', 'general_events', 'calendar_subscriptions', 'user_settings']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I
                    for each row execute function public.update_updated_at()', t || '_updated_at', t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 健康ログの条件付き upsert（/api/health から呼ぶ）
-- security invoker なので、呼び出した人の RLS がそのままかかる
-- ------------------------------------------------------------
create or replace function public.upsert_health_log(
  p_user_id uuid, p_log_date date, p_weight numeric, p_intake numeric, p_active numeric, p_steps integer
)
returns public.health_logs
language plpgsql
set search_path = ''
as $$
declare
  result public.health_logs;
begin
  insert into public.health_logs as h
    (user_id, log_date, weight_kg, intake_kcal, active_kcal, steps, updated_at)
  values (
    p_user_id, p_log_date,
    nullif(p_weight, 0), nullif(p_intake, 0), nullif(p_active, 0), nullif(p_steps, 0),
    now()
  )
  on conflict (user_id, log_date) do update set
    -- 体重/活動kcal/歩数: 送信値が null か 0 なら既存値を保持（未計測の0で消さない）
    weight_kg = case
      when excluded.weight_kg is null or excluded.weight_kg = 0 then h.weight_kg
      else excluded.weight_kg end,
    active_kcal = case
      when excluded.active_kcal is null or excluded.active_kcal = 0 then h.active_kcal
      else excluded.active_kcal end,
    steps = case
      when excluded.steps is null or excluded.steps = 0 then h.steps
      else excluded.steps end,
    -- 摂取kcal: 後から来た値のほうが大きいときだけ更新
    intake_kcal = case
      when excluded.intake_kcal is null or excluded.intake_kcal = 0 then h.intake_kcal
      when h.intake_kcal is null then excluded.intake_kcal
      when excluded.intake_kcal > h.intake_kcal then excluded.intake_kcal
      else h.intake_kcal end,
    updated_at = now()
  returning h.* into result;
  return result;
end;
$$;

-- ------------------------------------------------------------
-- RLS: 本人の行だけを読み書きできる
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['companies', 'es', 'es_submissions', 'es_templates', 'tasks',
                           'company_events', 'general_events', 'advice_notes',
                           'pomodoro_sessions', 'health_logs', 'calendar_subscriptions']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'Users select own ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'Users insert own ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'Users update own ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'Users delete own ' || t, t);
    execute format('create policy %I on public.%I for select using (auth.uid() = user_id)', 'Users select own ' || t, t);
    execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id)', 'Users insert own ' || t, t);
    execute format('create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', 'Users update own ' || t, t);
    execute format('create policy %I on public.%I for delete using (auth.uid() = user_id)', 'Users delete own ' || t, t);
  end loop;
end $$;

-- es_rules
alter table public.es_rules enable row level security;
drop policy if exists "Users select own es_rules" on public.es_rules;
drop policy if exists "Users insert own es_rules" on public.es_rules;
drop policy if exists "Users update own es_rules" on public.es_rules;
drop policy if exists "Users delete own es_rules" on public.es_rules;
create policy "Users select own es_rules" on public.es_rules for select using (auth.uid() = user_id);
create policy "Users insert own es_rules" on public.es_rules for insert with check (auth.uid() = user_id);
create policy "Users update own es_rules" on public.es_rules for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own es_rules" on public.es_rules for delete using (auth.uid() = user_id);

-- health_log_requests はログなので UPDATE ポリシーなし（書き換え不可）
alter table public.health_log_requests enable row level security;
drop policy if exists "Users select own health_log_requests" on public.health_log_requests;
drop policy if exists "Users insert own health_log_requests" on public.health_log_requests;
drop policy if exists "Users delete own health_log_requests" on public.health_log_requests;
create policy "Users select own health_log_requests" on public.health_log_requests for select using (auth.uid() = user_id);
create policy "Users insert own health_log_requests" on public.health_log_requests for insert with check (auth.uid() = user_id);
create policy "Users delete own health_log_requests" on public.health_log_requests for delete using (auth.uid() = user_id);

-- user_settings（行を消す必要はないので DELETE ポリシーなし）
alter table public.user_settings enable row level security;
drop policy if exists "Users select own user_settings" on public.user_settings;
drop policy if exists "Users insert own user_settings" on public.user_settings;
drop policy if exists "Users update own user_settings" on public.user_settings;
create policy "Users select own user_settings" on public.user_settings for select using (auth.uid() = user_id);
create policy "Users insert own user_settings" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "Users update own user_settings" on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- ストレージ: ES の提出ファイル（非公開バケット・本人のフォルダだけ）
-- ファイルは「<user_id>/<ランダムなID>.<拡張子>」に保存する
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('es-files', 'es-files', false)
on conflict (id) do nothing;

drop policy if exists "es-files own read" on storage.objects;
drop policy if exists "es-files own insert" on storage.objects;
drop policy if exists "es-files own update" on storage.objects;
drop policy if exists "es-files own delete" on storage.objects;
create policy "es-files own read" on storage.objects for select
  using (bucket_id = 'es-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "es-files own insert" on storage.objects for insert
  with check (bucket_id = 'es-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "es-files own update" on storage.objects for update
  using (bucket_id = 'es-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "es-files own delete" on storage.objects for delete
  using (bucket_id = 'es-files' and (storage.foldername(name))[1] = auth.uid()::text);
