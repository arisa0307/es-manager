"use server";

import { revalidatePath } from "next/cache";
import { getAuthedClient } from "@/lib/supabase/auth";
import { isFeatureKey, resolveFeatureFlags, type FeatureFlags } from "@/lib/features";

/**
 * 本人の機能設定を1つ切り替える。RLS で本人の行しか読み書きできない。
 * オフにしても、その機能のデータは消さない（表示を止めるだけ）。
 */
export async function setFeatureEnabled(key: string, enabled: boolean): Promise<FeatureFlags> {
  if (!isFeatureKey(key)) throw new Error("不明な機能です");
  if (typeof enabled !== "boolean") throw new Error("値が不正です");

  const { supabase, user } = await getAuthedClient();
  const { data: current, error: readError } = await supabase
    .from("user_settings")
    .select("features")
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  // 今の画面に見えている状態（既定値を含む）を保存してから、1つだけ変える。
  // こうしておくと、あとで既定値を変えても、本人が選んだ状態は変わらない。
  const next = { ...resolveFeatureFlags(current?.features), [key]: enabled };
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, features: next }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  return next;
}
