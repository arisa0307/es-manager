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
    .is("deleted_at", null)
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
    .is("deleted_at", null)
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
  if (isDuplicateEventError(error)) throw new Error(DUPLICATE_EVENT_MESSAGE);
  if (error) throw new Error(error.message);
  revalidateGeneralEventPaths();
  return data;
}

export async function deleteGeneralEvent(id: string) {
  const { supabase } = await getAuthedClient();
  // ゴミ箱へ(ソフト削除)。既に生存していないなら対象なし扱い。
  const { data, error } = await supabase
    .from("general_events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
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
  revalidatePath("/trash");
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
  if (isDuplicateEventError(error)) throw new Error(DUPLICATE_EVENT_MESSAGE);
  if (error) throw new Error(error.message);
  revalidateGeneralEventPaths();
  return data;
}

const DUPLICATE_EVENT_MESSAGE = "同じ日時の予定が既にあります";
function isDuplicateEventError(error: { code?: string } | null) {
  return error?.code === "23505";
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
