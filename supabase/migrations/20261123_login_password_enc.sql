-- Webテストのログインパスワードを暗号化して保存するための列。
-- 値はアプリのサーバー側で AES-256-GCM で暗号化した文字列（"v1:..."）。
-- 鍵は Vercel の環境変数 LOGIN_PASSWORD_ENCRYPTION_KEY にあり、DB には置かない。
-- 既存の RLS（本人の行だけ）がこの列にもそのままかかる。
alter table public.companies add column if not exists login_password_enc text;

comment on column public.companies.login_password_enc is
  'AES-256-GCM で暗号化したログインパスワード（v1:base64(iv|tag|暗号文)、AAD=持ち主の user_id）';
comment on column public.companies.login_password is
  '旧: 平文のログインパスワード。暗号化して移し替えたあとは空にする。新しい値は書かない';
