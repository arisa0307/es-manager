-- 利用者ごとの機能設定（個人向け機能のオン／オフ）
--
-- features は { "focus": true, "gtd": false, ... } の形。キーがなければ
-- アプリ側の既定値（個人向け機能はオフ）を使う。オフにしても各機能のデータは消さない。
-- RLS で、本人の行だけを読み書きできる。削除はしない（行を消すと既定値に戻るだけなので不要）。

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_settings_features_is_object check (jsonb_typeof(features) = 'object')
);

alter table public.user_settings enable row level security;

drop policy if exists "Users select own user_settings" on public.user_settings;
drop policy if exists "Users insert own user_settings" on public.user_settings;
drop policy if exists "Users update own user_settings" on public.user_settings;
create policy "Users select own user_settings" on public.user_settings
  for select using (auth.uid() = user_id);
create policy "Users insert own user_settings" on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy "Users update own user_settings" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists user_settings_updated_at on public.user_settings;
create trigger user_settings_updated_at before update on public.user_settings
  for each row execute function public.update_updated_at();
