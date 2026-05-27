"use server";

import {
  buildCompanyEventScheduleEntries,
  getCompanyEventScheduleLabel,
} from "@/lib/company-event-utils";
import { getCalendarCompanyEvents } from "@/lib/actions/companies";
import { getCalendarCompanyScheduleEvents } from "@/lib/actions/company-events";
import { getCalendarGeneralEvents } from "@/lib/actions/general-events";
import { getCalendarTaskEvents } from "@/lib/actions/tasks";
import { formatTimeRange } from "@/lib/utils";
import {
  GENERAL_EVENT_TYPE_LABELS,
  type CompanyEventType,
  type GeneralEventType,
  type ScheduleItem,
} from "@/types";

export async function getScheduleForDates(dates: string[]) {
  const dateSet = new Set(dates);
  const [generalEvents, companyEvents, companyDeadlines, tasks] =
    await Promise.all([
      getCalendarGeneralEvents(),
      getCalendarCompanyScheduleEvents(),
      getCalendarCompanyEvents(),
      getCalendarTaskEvents(),
    ]);

  const items: ScheduleItem[] = [];

  for (const event of generalEvents) {
    if (!dateSet.has(event.event_date)) continue;
    items.push({
      id: `g-${event.id}`,
      date: event.event_date,
      title: event.title,
      kind: "general",
      label: GENERAL_EVENT_TYPE_LABELS[event.type as GeneralEventType],
      href: "/",
      time: formatTimeRange(event.event_time, event.event_end_time) || null,
      memo: null,
    });
  }

  for (const event of companyEvents) {
    for (const entry of buildCompanyEventScheduleEntries(event)) {
      if (!dateSet.has(entry.date)) continue;
      items.push({
        id: `e-${entry.id}`,
        date: entry.date,
        title: event.title,
        kind: "company_event",
        label: getCompanyEventScheduleLabel(
          event.type as CompanyEventType,
          entry
        ),
        href: `/companies/${event.company_id}`,
        time: formatTimeRange(entry.startTime, entry.endTime) || null,
      });
    }
  }

  for (const company of companyDeadlines) {
    if (!company.deadline || !dateSet.has(company.deadline)) continue;
    items.push({
      id: `c-${company.id}`,
      date: company.deadline,
      title: company.name,
      kind: "company_deadline",
      label: "企業締切",
      href: `/companies/${company.id}`,
    });
  }

  for (const task of tasks) {
    if (!task.deadline || !dateSet.has(task.deadline)) continue;
    items.push({
      id: `t-${task.id}`,
      date: task.deadline,
      title: task.title,
      kind: "task",
      label: "タスク",
      href: task.company_id ? `/companies/${task.company_id}` : "/tasks",
    });
  }

  return items.sort((a, b) => a.title.localeCompare(b.title, "ja"));
}
