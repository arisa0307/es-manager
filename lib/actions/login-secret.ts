"use server";

import { unstable_noStore as noStore } from "next/cache";
import { getAuthedClient } from "@/lib/supabase/auth";
import { decryptForUser } from "@/lib/crypto/login-secret";

export type RevealResult = { ok: true; password: string } | { ok: false; error: string };

/**
 * 「表示」「コピー」を押したときだけ呼ぶ。本人の行かを確かめてから復号して返す。
 * パスワードはページの HTML には含めず、ログにも出さない。
 */
export async function revealLoginPassword(companyId: string): Promise<RevealResult> {
  noStore();
  if (typeof companyId !== "string" || !companyId) {
    return { ok: false, error: "企業が指定されていません" };
  }
  const { supabase, user } = await getAuthedClient();
  // RLS でも本人の行に限られるが、念のため user_id でも絞り込む
  const { data, error } = await supabase
    .from("companies")
    .select("user_id, login_password_enc")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .maybeSingle<{ user_id: string; login_password_enc: string | null }>();
  if (error) return { ok: false, error: "読み込みに失敗しました" };
  if (!data || data.user_id !== user.id) return { ok: false, error: "見つかりません" };
  if (!data.login_password_enc) return { ok: false, error: "パスワードは保存されていません" };

  try {
    return { ok: true, password: decryptForUser(data.login_password_enc, user.id) };
  } catch {
    // 鍵の設定ミスや値の破損。中身は出さず、起きたことだけを返す
    return { ok: false, error: "パスワードを元に戻せませんでした（鍵の設定を確認してください）" };
  }
}
