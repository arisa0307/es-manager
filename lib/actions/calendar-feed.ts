"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAuthedClient } from "@/lib/supabase/auth";

const TOKEN_BYTES = 32;

function generateToken() {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export async function getCalendarFeedToken() {
  const { supabase, user } = await getAuthedClient();
  const { data, error } = await supabase
    .from("calendar_subscriptions")
    .select("token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (isMissingCalendarSubscriptionsTable(error)) return null;
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

  if (isMissingCalendarSubscriptionsTable(error)) {
    throw new Error(
      "カレンダー購読の設定テーブルがありません。Supabaseで migration.sql を実行してください。"
    );
  }
  if (error) throw new Error(error.message);
  revalidatePath("/calendar");
}

export async function rotateCalendarFeedSubscription() {
  const { supabase, user } = await getAuthedClient();

  const token = generateToken();
  const { error } = await supabase
    .from("calendar_subscriptions")
    .update({ token })
    .eq("user_id", user.id);

  if (isMissingCalendarSubscriptionsTable(error)) {
    throw new Error(
      "カレンダー購読の設定テーブルがありません。Supabaseで migration.sql を実行してください。"
    );
  }
  if (error) throw new Error(error.message);
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
