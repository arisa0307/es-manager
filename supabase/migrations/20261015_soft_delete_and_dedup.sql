-- ゴミ箱方式の削除(deleted_at)と、予定の重複防止(部分ユニークインデックス)。
-- 追加のみ・冪等。既存のRLSポリシー(DELETE含む)はそのまま残す。
-- マルチテナント(auth.uid() = user_id)の既存動作は変更しない。

alter table public.company_events add column if not exists deleted_at timestamptz;
alter table public.tasks          add column if not exists deleted_at timestamptz;
alter table public.general_events add column if not exists deleted_at timestamptz;

-- 既存の重複1件(全ユーザー中これだけ)を先にゴミ箱へ。
-- これをしないと下のユニークインデックス作成が失敗する。
update public.company_events set deleted_at = now()
where id = '1ec972d9-4871-42c3-a7c4-4cda54385bc8';

-- 同じ企業・日付・時刻の予定を2件作らせない(時刻ありのみ・ゴミ箱は除外)。
create unique index if not exists company_events_no_dup
  on public.company_events (user_id, company_id, event_date, event_time)
  where deleted_at is null and event_time is not null;

create unique index if not exists general_events_no_dup
  on public.general_events (user_id, event_date, event_time, title)
  where deleted_at is null and event_time is not null;

-- 一覧取得を速くするための部分インデックス(任意)。
create index if not exists company_events_active_idx
  on public.company_events (user_id) where deleted_at is null;
create index if not exists tasks_active_idx
  on public.tasks (user_id) where deleted_at is null;
create index if not exists general_events_active_idx
  on public.general_events (user_id) where deleted_at is null;
