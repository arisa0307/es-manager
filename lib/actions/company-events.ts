"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CompanyEventInsert, CompanyEventUpdate } from "@/types";

export async function getCompanyEvents(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_events")
    .select("*")
    .eq("company_id", companyId)
    .order("event_date", { ascending: true });

  if (isMissingCompanyEventsTable(error)) return [];
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCalendarCompanyScheduleEvents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_events")
    .select("id, company_id, type, title, event_date")
    .order("event_date", { ascending: true });

  if (isMissingCompanyEventsTable(error)) return [];
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCompanyEvent(input: CompanyEventInsert) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_events")
    .insert(input)
    .select()
    .single();

  if (isMissingCompanyEventsTable(error)) {
    throw new Error("Supabaseでmigration.sqlを実行してから日程を追加してください");
  }
  if (error) throw new Error(error.message);
  revalidateCompanyEventPaths(input.company_id);
  return data;
}

export async function updateCompanyEvent(
  id: string,
  input: CompanyEventUpdate
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_events")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (isMissingCompanyEventsTable(error)) {
    throw new Error("Supabaseでmigration.sqlを実行してから日程を更新してください");
  }
  if (error) throw new Error(error.message);
  revalidateCompanyEventPaths(data.company_id);
  return data;
}

export async function deleteCompanyEvent(id: string) {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("company_events")
    .select("company_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("company_events").delete().eq("id", id);
  if (isMissingCompanyEventsTable(error)) return;
  if (error) throw new Error(error.message);

  if (row?.company_id) revalidateCompanyEventPaths(row.company_id);
}

function isMissingCompanyEventsTable(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST205" ||
    error?.message?.includes("public.company_events") ||
    error?.message?.includes("schema cache")
  );
}

function revalidateCompanyEventPaths(companyId: string) {
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath(`/companies/${companyId}`);
}
