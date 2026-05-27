"use server";

import { revalidatePath } from "next/cache";
import { getAuthedClient } from "@/lib/supabase/auth";

function generateToken() {
  const first = crypto.randomUUID().replaceAll("-", "");
  const second = crypto.randomUUID().replaceAll("-", "");
  return `${first}${second}`;
}

export async function getCalendarFeedToken() {
  const { supabase, user } = await getAuthedClient();
  const { data, error } = await supabase
    .from("calendar_subscriptions")
    .select("token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (isMissingCalendarSubscriptionsTable(error)) {
    throw new Error(
      "カレンダー購読の設定テーブルがありません。Supabaseで migration.sql を実行してください。"
    );
  }
  if (error) throw new Error(error.message);
  return data?.token ?? null;
}

export async function createCalendarFeedSubscription() {
  const { supabase, user } = await getAuthedClient();

  const token = generateToken();
  const { error } = await supabase.from("calendar_subscriptions").upsert(
    {
      user_id: user.id,
      token,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("createCalendarFeedSubscription failed", error);
    return;
  }
  revalidatePath("/calendar");
}

export async function rotateCalendarFeedSubscription() {
  const { supabase, user } = await getAuthedClient();

  const token = generateToken();
  const { error } = await supabase
    .from("calendar_subscriptions")
    .update({ token })
    .eq("user_id", user.id);

  if (error) {
    console.error("rotateCalendarFeedSubscription failed", error);
    return;
  }
  revalidatePath("/calendar");
}

function isMissingCalendarSubscriptionsTable(
  error: { code?: string; message?: string } | null
) {
  return (
    error?.code === "PGRST205" ||
    error?.message?.includes("public.calendar_subscriptions") ||
    error?.message?.includes("schema cache")
  );
}
