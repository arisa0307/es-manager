// サーバー側（Server Component / Server Action / Route Handler）専用。
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_FEATURE_FLAGS,
  resolveFeatureFlags,
  type FeatureFlags,
  type FeatureKey,
} from "@/lib/features";

/**
 * ログイン中の利用者の機能設定。1回のリクエストの中では1度だけ読む。
 * 未ログイン・設定の行がない・表がまだ無い場合は、既定値（個人向け機能はオフ）。
 */
export const getFeatureFlags = cache(async (): Promise<FeatureFlags> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return DEFAULT_FEATURE_FLAGS;

  const { data, error } = await supabase
    .from("user_settings")
    .select("features")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("getFeatureFlags:", error.message);
    return DEFAULT_FEATURE_FLAGS;
  }
  return resolveFeatureFlags(data?.features);
});

export async function isFeatureEnabled(key: FeatureKey): Promise<boolean> {
  return (await getFeatureFlags())[key];
}

/**
 * ログインパスワードを新しく保存できる状態か（暗号化の鍵があり、暗号化の列も DB にある）。
 * どちらかが無い間は、入力欄を閉じて「今は保存できない」と表示する。
 */
export const canStoreLoginPassword = cache(async (): Promise<boolean> => {
  const { isEncryptionKeyConfigured } = await import("@/lib/crypto/login-secret");
  if (!isEncryptionKeyConfigured()) return false;
  const supabase = await createClient();
  const { error } = await supabase.from("companies").select("login_password_enc").limit(1);
  return !error;
});
