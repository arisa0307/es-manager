import {
  COMPANY_EVENT_TYPE_LABELS,
  type Company,
  type CompanyEvent,
  type CompanyEventType,
  type ScheduleItem,
  type Task,
} from "@/types";

/** 企業詳細用: 締切・日程・タスクを日付の近い順に並べる */
export function buildCompanyUpcomingSchedule(
  company: Company,
  tasks: Task[],
  events: CompanyEvent[]
): ScheduleItem[] {
  const today = new Date().toISOString().split("T")[0];
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
    });
  }

  for (const event of events) {
    items.push({
      id: `event-${event.id}`,
      date: event.event_date,
      title: event.title,
      kind: "company_event",
      label: COMPANY_EVENT_TYPE_LABELS[event.type as CompanyEventType],
      href: `#company-events`,
      memo: event.memo,
    });
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
    });
  }

  const kindOrder: Record<ScheduleItem["kind"], number> = {
    company_deadline: 0,
    company_event: 1,
    task: 2,
    general: 3,
  };

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
