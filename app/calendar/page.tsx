import { Suspense } from "react";
import { getCalendarCompanyEvents } from "@/lib/actions/companies";
import { getCalendarCompanyScheduleEvents } from "@/lib/actions/company-events";
import { getCalendarGeneralEvents } from "@/lib/actions/general-events";
import { getCalendarTaskEvents } from "@/lib/actions/tasks";
import { PageHeader } from "@/components/layout/PageHeader";
import { CalendarView } from "@/components/calendar/CalendarView";
import { Card } from "@/components/ui/Card";
import type { CalendarEvent } from "@/types";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  let events: CalendarEvent[] = [];
  let error: string | null = null;

  try {
    const [companies, tasks, companyEvents, generalEvents] = await Promise.all([
      getCalendarCompanyEvents(),
      getCalendarTaskEvents(),
      getCalendarCompanyScheduleEvents(),
      getCalendarGeneralEvents(),
    ]);

    events = [
      ...generalEvents.map((event) => ({
        id: `g-${event.id}`,
        date: event.event_date,
        title: event.title,
        type: event.type as CalendarEvent["type"],
        href: "/",
      })),
      ...companies.map((c) => ({
        id: `c-${c.id}`,
        date: c.deadline!,
        title: c.name,
        type: "company" as const,
        companyId: c.id,
        href: `/companies/${c.id}`,
      })),
      ...tasks.map((t) => ({
        id: `t-${t.id}`,
        date: t.deadline!,
        title: t.title,
        type: "task" as const,
        companyId: t.company_id ?? undefined,
        href: t.company_id ? `/companies/${t.company_id}` : "/tasks",
      })),
      ...companyEvents.map((event) => ({
        id: `e-${event.id}`,
        date: event.event_date,
        title: event.title,
        type: event.type as CalendarEvent["type"],
        companyId: event.company_id,
        href: `/companies/${event.company_id}`,
      })),
    ];
  } catch (e) {
    error = e instanceof Error ? e.message : "取得に失敗しました";
  }

  return (
    <>
      <PageHeader title="カレンダー" description="企業締切・タスク・面接/インターン・一般予定" />
      {error ? (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : (
        <Suspense>
          <CalendarView events={events} />
        </Suspense>
      )}
    </>
  );
}
