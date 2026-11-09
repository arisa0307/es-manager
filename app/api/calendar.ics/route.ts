import {
  buildCompanyEventScheduleEntries,
  getCompanyEventScheduleLabel,
} from "@/lib/company-event-utils";
import {
  getCalendarFeedName,
  isImportantCompanyEntry,
  parseCalendarFeedScope,
} from "@/lib/calendar-feed-scope";
import { buildIcsCalendar } from "@/lib/calendar-ics";
import { shouldShowTaskOnCalendar } from "@/lib/calendar-task-visibility";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  GENERAL_EVENT_TYPE_LABELS,
  type CompanyEventType,
  type GeneralEventType,
} from "@/types";

export const dynamic = "force-dynamic";

/** カレンダー一覧で種別をひと目で見分けるためのアイコン */
const COMPANY_EVENT_ICONS: Record<CompanyEventType, string> = {
  info_session: "📢",
  internship: "🏢",
  es: "📝",
  web_test: "💻",
  gd: "🗣️",
  interview: "👥",
  other: "📌",
};

const GENERAL_EVENT_ICONS: Record<GeneralEventType, string> = {
  career_fair: "🎪",
  seminar: "📚",
  other: "📌",
};

function badRequest(message: string, status = 400) {
  return new Response(message, { status });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();
  if (!token) return badRequest("token is required");
  const scope = parseCalendarFeedScope(searchParams.get("scope"));

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
      // 企業名の解決にも使うため、締切の有無に関わらず全企業を取得する
      supabase
        .from("companies")
        .select("id, name, deadline")
        .eq("user_id", subscription.user_id),
      supabase
        .from("tasks")
        .select(
          "id, title, deadline, is_done, company_id, est_pomos, show_on_calendar"
        )
        .eq("user_id", subscription.user_id)
        .is("deleted_at", null)
        .eq("is_done", false)
        .not("deadline", "is", null),
      supabase
        .from("company_events")
        .select(
          "id, company_id, type, title, schedule_status, event_date, event_time, event_end_time, candidate_slots, memo, result"
        )
        .eq("user_id", subscription.user_id)
        .is("deleted_at", null),
      supabase
        .from("general_events")
        .select("id, title, type, event_date, event_time, event_end_time, location, memo")
        .eq("user_id", subscription.user_id)
        .is("deleted_at", null)
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

  // カレンダー上でタイトルが途中で切れても種別が分かるよう、
  // 「アイコン + 種別 ｜ 企業名 タイトル」の順で先頭に種別を置く。
  const companySuffix = (companyId: string | null | undefined) => {
    if (!companyId) return "";
    const name = byCompanyId.get(companyId);
    return name ? `${name} ` : "";
  };

  const nonCompanyEventEntries = [
    ...(companies ?? [])
      .filter((c) => c.deadline)
      .map((c) => ({
        uid: `company-deadline-${c.id}`,
        title: `⏰ 締切｜${c.name} エントリー締切`,
        description: `企業: ${c.name}`,
        date: c.deadline!,
        allDay: true,
        url: appBaseUrl ? `${appBaseUrl}/companies/${c.id}` : null,
      })),
    // 出さない条件のタスクは除外する。iCal 購読なのでフィードから外れれば
    // 次回の同期でカレンダー側の予定も自動的に消える。
    ...(tasks ?? []).filter(shouldShowTaskOnCalendar).map((t) => ({
      uid: `task-${t.id}`,
      title: `✅ タスク｜${companySuffix(t.company_id)}${t.title}`,
      description: t.company_id ? `企業: ${byCompanyId.get(t.company_id) ?? "未設定"}` : null,
      date: t.deadline!,
      allDay: true,
      url: appBaseUrl
        ? t.company_id
          ? `${appBaseUrl}/companies/${t.company_id}`
          : `${appBaseUrl}/tasks`
        : null,
    })),
    ...(generalEvents ?? []).map((g) => ({
      uid: `general-${g.id}`,
      title: `${GENERAL_EVENT_ICONS[g.type as GeneralEventType] ?? "📌"} ${GENERAL_EVENT_TYPE_LABELS[g.type as GeneralEventType]}｜${g.title}`,
      description: g.memo,
      location: g.location,
      date: g.event_date!,
      startTime: g.event_time ?? null,
      endTime: g.event_end_time ?? null,
      url: appBaseUrl ? `${appBaseUrl}/` : null,
    })),
  ];

  const companyEventEntries = (companyEvents ?? [])
    .flatMap((event) =>
      buildCompanyEventScheduleEntries(event).map((entry) => ({
        important: isImportantCompanyEntry(event.type as CompanyEventType, entry),
        icsEvent: {
          uid: `company-event-${entry.id}`,
          title: `${COMPANY_EVENT_ICONS[event.type as CompanyEventType] ?? "📌"} ${getCompanyEventScheduleLabel(event.type as CompanyEventType, entry)}｜${companySuffix(event.company_id)}${event.title}`,
          description: [
            byCompanyId.get(event.company_id) && `企業: ${byCompanyId.get(event.company_id)}`,
            event.result && `結果: ${event.result}`,
            event.memo,
          ]
            .filter(Boolean)
            .join("\n"),
          date: entry.date,
          startTime: entry.startTime,
          endTime: entry.endTime,
          url: appBaseUrl ? `${appBaseUrl}/companies/${event.company_id}` : null,
        },
      }))
    )
    .filter(({ important }) => scope === "all" || important === (scope === "important"))
    .map(({ icsEvent }) => icsEvent);

  const events = [
    ...(scope === "important" ? [] : nonCompanyEventEntries),
    ...companyEventEntries,
  ].sort((a, b) => {
    const date = a.date.localeCompare(b.date);
    if (date !== 0) return date;
    return a.title.localeCompare(b.title, "ja");
  });

  const ics = buildIcsCalendar(events, getCalendarFeedName(scope));

  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "private, max-age=300",
      "content-disposition": 'inline; filename="at-calendar.ics"',
    },
  });
}
