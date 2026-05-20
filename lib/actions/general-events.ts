"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { GeneralEventInsert, GeneralEventUpdate } from "@/types";

export async function getGeneralEvents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("general_events")
    .select("*")
    .order("event_date", { ascending: true });

  if (isMissingGeneralEventsTable(error)) return [];
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCalendarGeneralEvents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("general_events")
    .select("id, title, type, event_date")
    .order("event_date", { ascending: true });

  if (isMissingGeneralEventsTable(error)) return [];
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createGeneralEvent(input: GeneralEventInsert) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("general_events")
    .insert(input)
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
  const supabase = await createClient();
  const { error } = await supabase.from("general_events").delete().eq("id", id);
  if (isMissingGeneralEventsTable(error)) return;
  if (error) throw new Error(error.message);
  revalidateGeneralEventPaths();
}

export async function updateGeneralEvent(id: string, input: GeneralEventUpdate) {
  const supabase = await createClient();
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
