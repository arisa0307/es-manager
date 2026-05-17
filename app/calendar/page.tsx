import { Suspense } from "react";
import { getCalendarCompanyEvents } from "@/lib/actions/companies";
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
    const [companies, tasks] = await Promise.all([
      getCalendarCompanyEvents(),
      getCalendarTaskEvents(),
    ]);

    events = [
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
    ];
  } catch (e) {
    error = e instanceof Error ? e.message : "取得に失敗しました";
  }

  return (
    <>
      <PageHeader title="カレンダー" description="企業締切・タスク締切" />
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
