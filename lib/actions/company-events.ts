"use server";

import { revalidatePath } from "next/cache";
import {
  buildCompanyEventScheduleEntries,
  getCompanyEventScheduleLabel,
  hasScheduleConflict,
} from "@/lib/company-event-utils";
import { getAuthedClient } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateFull, formatTimeRange } from "@/lib/utils";
import type {
  CalendarCompanyEventRow,
  CompanyEventCandidateSlot,
  CompanyEventInsert,
  CompanyEventType,
  CompanyEventUpdate,
  EventScheduleStatus,
} from "@/types";

export async function getCompanyEvents(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_events")
    .select("*")
    .eq("company_id", companyId)
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (isMissingCompanyEventsTable(error)) return [];
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCalendarCompanyScheduleEvents(): Promise<
  CalendarCompanyEventRow[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_events")
    .select(
      "id, company_id, type, title, schedule_status, event_date, event_time, event_end_time, candidate_slots, companies(name)"
    )
    .order("event_date", { ascending: true, nullsFirst: false });

  if (isMissingCompanyEventsTable(error)) return [];
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CalendarCompanyEventRow[];
}

export async function createCompanyEvent(input: CompanyEventInsert) {
  const { supabase, user } = await getAuthedClient();
  const { data, error } = await supabase
    .from("company_events")
    .insert({ ...input, user_id: user.id })
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
  const { supabase } = await getAuthedClient();
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

export type CompanyEventConflict = {
  key: string;
  summary: string;
};

export async function checkCompanyEventConflicts(input: {
  id?: string;
  title: string;
  type: CompanyEventType;
  schedule_status?: EventScheduleStatus | null;
  event_date?: string | null;
  event_time?: string | null;
  event_end_time?: string | null;
  candidate_slots?: CompanyEventCandidateSlot[] | null;
}) {
  const { supabase } = await getAuthedClient();

  let companyEventsQuery = supabase
    .from("company_events")
    .select(
      "id, company_id, title, type, schedule_status, event_date, event_time, event_end_time, candidate_slots"
    );
  if (input.id) companyEventsQuery = companyEventsQuery.neq("id", input.id);

  const [companyEventsResult, generalEventsResult, companiesResult] = await Promise.all([
    companyEventsQuery,
    supabase
      .from("general_events")
      .select("id, title, event_date, event_time")
      .not("event_date", "is", null),
    supabase.from("companies").select("id, name"),
  ]);

  if (isMissingCompanyEventsTable(companyEventsResult.error)) {
    return [] as CompanyEventConflict[];
  }
  if (companyEventsResult.error) throw new Error(companyEventsResult.error.message);
  if (generalEventsResult.error && !isMissingGeneralEventsTable(generalEventsResult.error)) {
    throw new Error(generalEventsResult.error.message);
  }
  if (companiesResult.error) throw new Error(companiesResult.error.message);

  const companyNames = new Map(
    (companiesResult.data ?? []).map((company) => [company.id, company.name])
  );
  const draftEntries = buildCompanyEventScheduleEntries({
    id: input.id ?? "draft",
    schedule_status: input.schedule_status ?? "confirmed",
    event_date: input.event_date ?? null,
    event_time: input.event_time ?? null,
    event_end_time: input.event_end_time ?? null,
    candidate_slots: input.candidate_slots ?? [],
  });
  const conflicts = new Map<string, CompanyEventConflict>();

  for (let i = 0; i < draftEntries.length; i += 1) {
    for (let j = i + 1; j < draftEntries.length; j += 1) {
      if (!hasScheduleConflict(draftEntries[i], draftEntries[j])) continue;
      const key = `draft:${draftEntries[i].id}:${draftEntries[j].id}`;
      conflicts.set(key, {
        key,
        summary: `${formatScheduleConflictDate(draftEntries[i].date, draftEntries[i].startTime, draftEntries[i].endTime)} に入力中の候補が重複しています`,
      });
    }
  }

  for (const event of companyEventsResult.data ?? []) {
    const companyName = companyNames.get(event.company_id);
    const existingEntries = buildCompanyEventScheduleEntries({
      id: event.id,
      schedule_status: event.schedule_status ?? "confirmed",
      event_date: event.event_date,
      event_time: event.event_time,
      event_end_time: event.event_end_time,
      candidate_slots: event.candidate_slots,
    });

    for (const draftEntry of draftEntries) {
      for (const existingEntry of existingEntries) {
        if (!hasScheduleConflict(draftEntry, existingEntry)) continue;
        const key = `company:${draftEntry.id}:${existingEntry.id}`;
        conflicts.set(key, {
          key,
          summary: `${formatScheduleConflictDate(existingEntry.date, existingEntry.startTime, existingEntry.endTime)} が「${companyName ? `${companyName} / ` : ""}${event.title}」(${getCompanyEventScheduleLabel(event.type as CompanyEventType, existingEntry)}) と重複しています`,
        });
      }
    }
  }

  for (const event of generalEventsResult.data ?? []) {
    for (const draftEntry of draftEntries) {
      if (
        !event.event_date ||
        !hasScheduleConflict(draftEntry, {
          date: event.event_date,
          startTime: event.event_time ?? null,
          endTime: null,
        })
      ) {
        continue;
      }

      const key = `general:${draftEntry.id}:${event.id}`;
      conflicts.set(key, {
        key,
        summary: `${formatScheduleConflictDate(event.event_date, event.event_time ?? null, null)} が一般予定「${event.title}」と重複しています`,
      });
    }
  }

  return [...conflicts.values()].sort((a, b) => a.summary.localeCompare(b.summary, "ja"));
}

export async function deleteCompanyEvent(id: string) {
  const { supabase } = await getAuthedClient();
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

function isMissingGeneralEventsTable(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST205" ||
    error?.message?.includes("public.general_events") ||
    error?.message?.includes("schema cache")
  );
}

function formatScheduleConflictDate(
  date: string,
  startTime: string | null,
  endTime: string | null
) {
  const timeLabel = formatTimeRange(startTime, endTime);
  return timeLabel
    ? `${formatDateFull(date)} ${timeLabel}`
    : `${formatDateFull(date)}（時間未設定）`;
}

function revalidateCompanyEventPaths(companyId: string) {
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath(`/companies/${companyId}`);
}
