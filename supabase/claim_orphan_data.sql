-- ログイン前に作ったデータ（user_id が null）を、ログイン後も見える・紐づけられるようにする
-- auth_migration.sql 実行後に、Supabase SQL Editor で一度実行してください

-- general_events
drop policy if exists "Users select own general_events" on general_events;
drop policy if exists "Users update own general_events" on general_events;
create policy "Users select own general_events" on general_events
  for select using (auth.uid() = user_id or user_id is null);
create policy "Users update own general_events" on general_events
  for update using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id);

-- companies
drop policy if exists "Users select own companies" on companies;
drop policy if exists "Users update own companies" on companies;
create policy "Users select own companies" on companies
  for select using (auth.uid() = user_id or user_id is null);
create policy "Users update own companies" on companies
  for update using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id);

-- tasks
drop policy if exists "Users select own tasks" on tasks;
drop policy if exists "Users update own tasks" on tasks;
create policy "Users select own tasks" on tasks
  for select using (auth.uid() = user_id or user_id is null);
create policy "Users update own tasks" on tasks
  for update using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id);

-- es
drop policy if exists "Users select own es" on es;
drop policy if exists "Users update own es" on es;
create policy "Users select own es" on es
  for select using (auth.uid() = user_id or user_id is null);
create policy "Users update own es" on es
  for update using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id);

-- es_templates
drop policy if exists "Users select own es_templates" on es_templates;
drop policy if exists "Users update own es_templates" on es_templates;
create policy "Users select own es_templates" on es_templates
  for select using (auth.uid() = user_id or user_id is null);
create policy "Users update own es_templates" on es_templates
  for update using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id);

-- company_events
drop policy if exists "Users select own company_events" on company_events;
drop policy if exists "Users update own company_events" on company_events;
create policy "Users select own company_events" on company_events
  for select using (auth.uid() = user_id or user_id is null);
create policy "Users update own company_events" on company_events
  for update using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id);

-- 手動で一括紐づけする場合（YOUR_USER_ID を Authentication の User UID に置き換え）
-- update general_events set user_id = 'YOUR_USER_ID' where user_id is null;
-- update companies set user_id = 'YOUR_USER_ID' where user_id is null;
-- update tasks set user_id = 'YOUR_USER_ID' where user_id is null;
-- update es set user_id = 'YOUR_USER_ID' where user_id is null;
-- update es_templates set user_id = 'YOUR_USER_ID' where user_id is null;
-- update company_events set user_id = 'YOUR_USER_ID' where user_id is null;
