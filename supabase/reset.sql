-- 型不一致（bigint vs uuid）でエラーが出たとき用
-- 既存データはすべて削除されます。友人向けMVPの初期セットアップ向け。
--
-- 手順:
-- 1. Supabase → SQL Editor でこのファイルを Run
-- 2. 続けて schema.sql を Run

drop table if exists es cascade;
drop table if exists tasks cascade;
drop table if exists company_events cascade;
drop table if exists general_events cascade;
drop table if exists es_templates cascade;
drop table if exists companies cascade;

-- 古いトリガー関数が残っている場合のみ（エラーなら無視してOK）
drop function if exists update_updated_at() cascade;
