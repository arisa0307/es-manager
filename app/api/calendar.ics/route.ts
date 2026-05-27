import {
  buildCompanyEventScheduleEntries,
  getCompanyEventScheduleLabel,
} from "@/lib/company-event-utils";
import { buildIcsCalendar } from "@/lib/calendar-ics";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  GENERAL_EVENT_TYPE_LABELS,
  type CompanyEventType,
  type GeneralEventType,
} from "@/types";

export const dynamic = "force-dynamic";

function badRequest(message: string, status = 400) {
  return new Response(message, { status });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) return badRequest("token is required");

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    return badRequest(
      error instanceof Error ? error.message : "calendar feed is unavailable",
      503
    );
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("calendar_subscriptions")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();

  if (subscriptionError) return badRequest(subscriptionError.message, 500);
  if (!subscription) return badRequest("invalid token", 404);

  const [{ data: companies, error: companiesError }, { data: tasks, error: tasksError }, { data: companyEvents, error: companyEventsError }, { data: generalEvents, error: generalEventsError }] =
    await Promise.all([
      supabase
        .from("companies")
        .select("id, name, deadline")
        .eq("user_id", subscription.user_id)
        .not("deadline", "is", null),
      supabase
        .from("tasks")
        .select("id, title, deadline, is_done, company_id")
        .eq("user_id", subscription.user_id)
        .eq("is_done", false)
        .not("deadline", "is", null),
      supabase
        .from("company_events")
        .select(
          "id, company_id, type, title, schedule_status, event_date, event_time, event_end_time, candidate_slots, memo"
        )
        .eq("user_id", subscription.user_id),
      supabase
        .from("general_events")
        .select("id, title, type, event_date, event_time, location, memo")
        .eq("user_id", subscription.user_id)
        .not("event_date", "is", null),
    ]);

  if (companiesError || tasksError || companyEventsError || generalEventsError) {
    return badRequest(
      companiesError?.message ||
        tasksError?.message ||
        companyEventsError?.message ||
        generalEventsError?.message ||
        "calendar build failed",
      500
    );
  }

  const byCompanyId = new Map((companies ?? []).map((c) => [c.id, c.name]));
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, "") ?? "";

  const events = [
    ...(companies ?? []).map((c) => ({
      uid: `company-deadline-${c.id}`,
      title: `企業締切: ${c.name}`,
      date: c.deadline!,
      url: appBaseUrl ? `${appBaseUrl}/companies/${c.id}` : null,
    })),
    ...(tasks ?? []).map((t) => ({
      uid: `task-${t.id}`,
      title: `タスク: ${t.title}`,
      description: t.company_id ? `企業: ${byCompanyId.get(t.company_id) ?? "未設定"}` : null,
      date: t.deadline!,
      url: appBaseUrl
        ? t.company_id
          ? `${appBaseUrl}/companies/${t.company_id}`
          : `${appBaseUrl}/tasks`
        : null,
    })),
    ...(generalEvents ?? []).map((g) => ({
      uid: `general-${g.id}`,
      title: `${GENERAL_EVENT_TYPE_LABELS[g.type as GeneralEventType]}: ${g.title}`,
      description: g.memo,
      location: g.location,
      date: g.event_date!,
      startTime: g.event_time ?? null,
      url: appBaseUrl ? `${appBaseUrl}/` : null,
    })),
    ...(companyEvents ?? []).flatMap((event) =>
      buildCompanyEventScheduleEntries(event).map((entry) => ({
        uid: `company-event-${entry.id}`,
        title: `${getCompanyEventScheduleLabel(event.type as CompanyEventType, entry)}: ${event.title}`,
        description: event.memo,
        date: entry.date,
        startTime: entry.startTime,
        endTime: entry.endTime,
        url: appBaseUrl ? `${appBaseUrl}/companies/${event.company_id}` : null,
      }))
    ),
  ].sort((a, b) => {
    const date = a.date.localeCompare(b.date);
    if (date !== 0) return date;
    return a.title.localeCompare(b.title, "ja");
  });

  const ics = buildIcsCalendar(events, "a.t 就活予定");

  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "private, max-age=300",
      "content-disposition": 'inline; filename="at-calendar.ics"',
    },
  });
}
