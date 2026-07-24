import {
  type Company,
  type CompanyEvent,
  type CompanyEventType,
  type ScheduleItem,
  type Task,
} from "@/types";
import {
  buildCompanyEventScheduleEntries,
  getCompanyEventScheduleLabel,
} from "@/lib/company-event-utils";
import { formatTimeRange, getTodayString } from "@/lib/utils";

/** 企業詳細用: 締切・日程・タスクを日付の近い順に並べる */
export function buildCompanyUpcomingSchedule(
  company: Company,
  tasks: Task[],
  events: CompanyEvent[]
): ScheduleItem[] {
  const href = `/companies/${company.id}`;
  const items: ScheduleItem[] = [];

  if (company.deadline) {
    items.push({
      id: `deadline-${company.id}`,
      date: company.deadline,
      title: "エントリー締切",
      kind: "company_deadline",
      label: "企業締切",
      href,
      deleteId: company.id,
    });
  }

  for (const event of events) {
    for (const entry of buildCompanyEventScheduleEntries(event)) {
      items.push({
        id: `event-${entry.id}`,
        date: entry.date,
        title: event.title,
        kind: "company_event",
        label: getCompanyEventScheduleLabel(
          event.type as CompanyEventType,
          entry
        ),
        href: `#company-events`,
        time: formatTimeRange(entry.startTime, entry.endTime) || null,
        memo: event.memo,
        deleteId: event.id,
      });
    }
  }

  for (const task of tasks) {
    if (!task.deadline || task.is_done) continue;
    items.push({
      id: `task-${task.id}`,
      date: task.deadline,
      title: task.title,
      kind: "task",
      label: "タスク",
      href: `#company-tasks`,
      memo: task.memo,
      deleteId: task.id,
    });
  }

  const kindOrder: Record<ScheduleItem["kind"], number> = {
    company_deadline: 0,
    company_event: 1,
    task: 2,
    general: 3,
  };

  // 締切・タスクは期限切れも見せる(見落とし防止)が、過ぎた企業イベントは要約から外す。
  const today = getTodayString();
  return items
    .filter((item) => {
      if (item.date >= today) return true;
      if (item.kind === "company_event") return false;
      return true;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return kindOrder[a.kind] - kindOrder[b.kind];
    });
}
