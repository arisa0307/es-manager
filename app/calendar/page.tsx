import { Suspense } from "react";
import { getCalendarCompanyEvents } from "@/lib/actions/companies";
import { getCalendarCompanyScheduleEvents } from "@/lib/actions/company-events";
import {
  createCalendarFeedSubscription,
  getCalendarFeedToken,
  rotateCalendarFeedSubscription,
} from "@/lib/actions/calendar-feed";
import { getCalendarTaskEvents } from "@/lib/actions/tasks";
import { buildCompanyEventScheduleEntries } from "@/lib/company-event-utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { CalendarView } from "@/components/calendar/CalendarView";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CopyableInput } from "@/components/ui/CopyableInput";
import { formatTimeRange } from "@/lib/utils";
import type { CalendarEvent } from "@/types";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  let events: CalendarEvent[] = [];
  let error: string | null = null;
  let feedToken: string | null = null;

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, "");

  try {
    const [companies, tasks, companyEvents, existingFeedToken] = await Promise.all([
      getCalendarCompanyEvents(),
      getCalendarTaskEvents(),
      getCalendarCompanyScheduleEvents(),
      getCalendarFeedToken(),
    ]);
    feedToken = existingFeedToken;

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
      ...companyEvents.flatMap((event) =>
        buildCompanyEventScheduleEntries(event).map((entry) => {
          const suffix = entry.isCandidate
            ? "候補"
            : entry.scheduleStatus === "tentative"
              ? "予定"
              : "";
          const timeLabel = formatTimeRange(entry.startTime, entry.endTime);

          return {
            id: `e-${entry.id}`,
            date: entry.date,
            title: [event.title, suffix && `(${suffix})`, timeLabel && `(${timeLabel})`]
              .filter(Boolean)
              .join(" "),
            type: event.type as CalendarEvent["type"],
            companyId: event.company_id,
            href: `/companies/${event.company_id}`,
          };
        })
      ),
    ];
  } catch (e) {
    error = e instanceof Error ? e.message : "取得に失敗しました";
  }

  return (
    <>
      <PageHeader title="カレンダー" description="企業締切・タスク・面接/インターン" />
      <Card className="mb-4">
        <div className="space-y-3">
          <h2 className="text-sm font-medium">Macカレンダー連携（自動同期）</h2>
          <p className="text-xs text-muted-foreground">
            購読URLをMacカレンダーの「新規カレンダー購読」に貼り付けると自動同期できます。
          </p>
          {!appBaseUrl ? (
            <p className="text-xs text-red-600">
              NEXT_PUBLIC_APP_URL が未設定のため購読URLを表示できません。
            </p>
          ) : feedToken ? (
            <div className="space-y-2">
              <CopyableInput
                name="calendar_feed_url"
                defaultValue={`${appBaseUrl}/api/calendar.ics?token=${feedToken}`}
              />
              <form action={rotateCalendarFeedSubscription}>
                <Button type="submit" variant="secondary" size="sm">
                  URLを再発行
                </Button>
              </form>
            </div>
          ) : (
            <form action={createCalendarFeedSubscription}>
              <Button type="submit" size="sm">
                購読URLを作成
              </Button>
            </form>
          )}
        </div>
      </Card>
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
