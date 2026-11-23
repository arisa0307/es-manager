"use server";

import { unstable_noStore as noStore } from "next/cache";
import { getAuthedClient } from "@/lib/supabase/auth";
import { decryptForUser } from "@/lib/crypto/login-secret";

export type RevealResult = { ok: true; password: string } | { ok: false; error: string };

type SecretRow = {
  user_id: string | null;
  login_password?: string | null;
  login_password_enc?: string | null;
};

/**
 * 「表示」「コピー」を押したときだけ呼ぶ。本人の行かを確かめてから値を返す。
 * - 暗号化した値（login_password_enc）があれば、それを復号して返す
 * - まだ移し替えていない行（暗号化した値が空で、平文だけある行）は、平文を返す
 *   （移し替えが終わるまでの逃げ道。鍵がなくても動く）
 * パスワードはページの HTML には含めず、ログにも出さない。
 */
export async function revealLoginPassword(companyId: string): Promise<RevealResult> {
  noStore();
  if (typeof companyId !== "string" || !companyId) {
    return { ok: false, error: "企業が指定されていません" };
  }
  const { supabase, user } = await getAuthedClient();
  // RLS でも本人の行に限られるが、念のため user_id でも絞り込む。
  // "*" で読むのは、暗号化の列を追加する前の DB でも動かすため。
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .maybeSingle<SecretRow>();
  if (error) return { ok: false, error: "読み込みに失敗しました" };
  if (!data || data.user_id !== user.id) return { ok: false, error: "見つかりません" };

  if (data.login_password_enc) {
    try {
      return { ok: true, password: decryptForUser(data.login_password_enc, user.id) };
    } catch {
      // 鍵の設定ミスや値の破損。中身は出さず、起きたことだけを返す
      return { ok: false, error: "パスワードを元に戻せませんでした（鍵の設定を確認してください）" };
    }
  }
  if (data.login_password) {
    return { ok: true, password: data.login_password };
  }
  return { ok: false, error: "パスワードは保存されていません" };
}
