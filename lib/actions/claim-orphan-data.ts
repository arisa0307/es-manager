"use server";

import { getAuthedClient } from "@/lib/supabase/auth";

const TABLES = [
  "companies",
  "tasks",
  "es",
  "es_templates",
  "company_events",
  "general_events",
] as const;

/**
 * ログイン導入前に登録されたデータ（user_id が null）を、
 * 現在ログイン中のアカウントに紐づける。削除はしない。
 */
export async function claimOrphanedUserData(): Promise<void> {
  const { supabase, user } = await getAuthedClient();

  // 6テーブルを逐次に待つと毎回6往復ぶんの遅延になる。並列で投げて1往復相当にする。
  await Promise.all(
    TABLES.map(async (table) => {
      const { error } = await supabase
        .from(table)
        .update({ user_id: user.id })
        .is("user_id", null);
      if (error) {
        // RLS 未設定などで失敗しても他テーブルは続行
        console.error(`claimOrphanedUserData: ${table}`, error.message);
      }
    })
  );
}
