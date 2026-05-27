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

  if (error) throw new Error(error.message);
  revalidatePath("/calendar");
}
