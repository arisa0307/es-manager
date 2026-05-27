"use server";

import { revalidatePath } from "next/cache";
import { getAuthedClient } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  CalendarGeneralEventRow,
  GeneralEventInsert,
  GeneralEventUpdate,
} from "@/types";

export async function getGeneralEvents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("general_events")
    .select("*")
    .order("updated_at", { ascending: false });

  if (isMissingGeneralEventsTable(error)) {
    throw new Error(
      "一般予定テーブルが見つかりません。Supabaseで migration.sql を実行してください。"
    );
  }
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCalendarGeneralEvents(): Promise<CalendarGeneralEventRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("general_events")
    .select("id, title, type, event_date, event_time, event_end_time")
    .not("event_date", "is", null)
    .order("event_date", { ascending: true });

  if (isMissingGeneralEventsTable(error)) {
    throw new Error(
      "一般予定テーブルが見つかりません。Supabaseで migration.sql を実行してください。"
    );
  }
  if (error) throw new Error(error.message);
  return (data ?? []) as CalendarGeneralEventRow[];
}

export async function createGeneralEvent(input: GeneralEventInsert) {
  const { supabase, user } = await getAuthedClient();
  const { data, error } = await supabase
    .from("general_events")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (isMissingGeneralEventsTable(error)) {
    throw new Error("Supabaseでmigration.sqlを実行してから予定を追加してください");
  }
  if (error) throw new Error(error.message);
  revalidateGeneralEventPaths();
  return data;
}

export async function deleteGeneralEvent(id: string) {
  const { supabase } = await getAuthedClient();
  const { data, error } = await supabase
    .from("general_events")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (isMissingGeneralEventsTable(error)) {
    throw new Error(
      "一般予定テーブルが見つかりません。Supabaseで migration.sql を実行してください。"
    );
  }
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error("削除対象の予定が見つかりませんでした（既に削除済みの可能性があります）");
  }
  revalidateGeneralEventPaths();
}

export async function updateGeneralEvent(id: string, input: GeneralEventUpdate) {
  const { supabase } = await getAuthedClient();
  const { data, error } = await supabase
    .from("general_events")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (isMissingGeneralEventsTable(error)) {
    throw new Error("Supabaseでmigration.sqlを実行してから予定を更新してください");
  }
  if (error) throw new Error(error.message);
  revalidateGeneralEventPaths();
  return data;
}

function isMissingGeneralEventsTable(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST205" ||
    error?.message?.includes("public.general_events") ||
    error?.message?.includes("schema cache")
  );
}

function revalidateGeneralEventPaths() {
  revalidatePath("/");
  revalidatePath("/calendar");
}
