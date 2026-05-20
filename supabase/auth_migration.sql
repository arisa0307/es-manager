-- ログイン認証用（migration.sql 実行後に実行）

-- user_id 列を追加
alter table companies add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table tasks add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table es add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table es_templates add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table company_events add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table general_events add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_companies_user_id on companies(user_id);
create index if not exists idx_tasks_user_id on tasks(user_id);
create index if not exists idx_es_user_id on es(user_id);
create index if not exists idx_es_templates_user_id on es_templates(user_id);
create index if not exists idx_company_events_user_id on company_events(user_id);
create index if not exists idx_general_events_user_id on general_events(user_id);

-- 旧ポリシーを削除
drop policy if exists "Allow all on companies" on companies;
drop policy if exists "Allow all on es" on es;
drop policy if exists "Allow all on tasks" on tasks;
drop policy if exists "Allow all on es_templates" on es_templates;
drop policy if exists "Allow all on company_events" on company_events;
drop policy if exists "Allow all on general_events" on general_events;

drop policy if exists "Users select own companies" on companies;
drop policy if exists "Users insert own companies" on companies;
drop policy if exists "Users update own companies" on companies;
drop policy if exists "Users delete own companies" on companies;
drop policy if exists "Users select own tasks" on tasks;
drop policy if exists "Users insert own tasks" on tasks;
drop policy if exists "Users update own tasks" on tasks;
drop policy if exists "Users delete own tasks" on tasks;
drop policy if exists "Users select own es" on es;
drop policy if exists "Users insert own es" on es;
drop policy if exists "Users update own es" on es;
drop policy if exists "Users delete own es" on es;
drop policy if exists "Users select own es_templates" on es_templates;
drop policy if exists "Users insert own es_templates" on es_templates;
drop policy if exists "Users update own es_templates" on es_templates;
drop policy if exists "Users delete own es_templates" on es_templates;
drop policy if exists "Users select own company_events" on company_events;
drop policy if exists "Users insert own company_events" on company_events;
drop policy if exists "Users update own company_events" on company_events;
drop policy if exists "Users delete own company_events" on company_events;
drop policy if exists "Users select own general_events" on general_events;
drop policy if exists "Users insert own general_events" on general_events;
drop policy if exists "Users update own general_events" on general_events;
drop policy if exists "Users delete own general_events" on general_events;

-- companies
create policy "Users select own companies" on companies for select using (auth.uid() = user_id);
create policy "Users insert own companies" on companies for insert with check (auth.uid() = user_id);
create policy "Users update own companies" on companies for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own companies" on companies for delete using (auth.uid() = user_id);

-- tasks
create policy "Users select own tasks" on tasks for select using (auth.uid() = user_id);
create policy "Users insert own tasks" on tasks for insert with check (auth.uid() = user_id);
create policy "Users update own tasks" on tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own tasks" on tasks for delete using (auth.uid() = user_id);

-- es
create policy "Users select own es" on es for select using (auth.uid() = user_id);
create policy "Users insert own es" on es for insert with check (auth.uid() = user_id);
create policy "Users update own es" on es for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own es" on es for delete using (auth.uid() = user_id);

-- es_templates
create policy "Users select own es_templates" on es_templates for select using (auth.uid() = user_id);
create policy "Users insert own es_templates" on es_templates for insert with check (auth.uid() = user_id);
create policy "Users update own es_templates" on es_templates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own es_templates" on es_templates for delete using (auth.uid() = user_id);

-- company_events
create policy "Users select own company_events" on company_events for select using (auth.uid() = user_id);
create policy "Users insert own company_events" on company_events for insert with check (auth.uid() = user_id);
create policy "Users update own company_events" on company_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own company_events" on company_events for delete using (auth.uid() = user_id);

-- general_events
create policy "Users select own general_events" on general_events for select using (auth.uid() = user_id);
create policy "Users insert own general_events" on general_events for insert with check (auth.uid() = user_id);
create policy "Users update own general_events" on general_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own general_events" on general_events for delete using (auth.uid() = user_id);
