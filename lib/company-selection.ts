import {
  COMPANY_EVENT_TYPE_LABELS,
  type CompanyEvent,
  type CompanyEventType,
  type ESSubmission,
  type Task,
} from "@/types";

export type SelectionStep = {
  id: string;
  /** ES / Webテスト / 面接 / タスク など、その選考ステップの種別ラベル */
  label: string;
  title: string;
  /** 予定なら開催日、タスクなら締切。未定なら null */
  date: string | null;
  result: string;
  source: "event" | "task" | "es";
  href: string;
};

/**
 * 企業ページ用: 日付が決まっている予定(company_events)、日付未定でタスク管理している
 * 選考(tasks)、提出済みのES(es)の「結果」を1本にまとめる。
 */
export function buildCompanySelectionSteps(
  tasks: Task[],
  events: CompanyEvent[],
  esSubmissions: ESSubmission[] = []
): SelectionStep[] {
  const steps: SelectionStep[] = [];

  for (const sub of esSubmissions) {
    if (!sub.result) continue;
    steps.push({
      id: `es-${sub.id}`,
      label: `ES(${sub.phase})`,
      title: sub.title || "ES提出",
      date: sub.submitted_on ?? null,
      result: sub.result,
      source: "es",
      href: "#company-es",
    });
  }

  for (const event of events) {
    if (!event.result) continue;
    steps.push({
      id: `event-${event.id}`,
      label: COMPANY_EVENT_TYPE_LABELS[event.type as CompanyEventType] ?? "予定",
      title: event.title,
      date: event.event_date ?? null,
      result: event.result,
      source: "event",
      href: "#company-events",
    });
  }

  for (const task of tasks) {
    if (!task.result) continue;
    steps.push({
      id: `task-${task.id}`,
      label: "タスク",
      title: task.title,
      date: task.deadline ?? null,
      result: task.result,
      source: "task",
      href: "#company-tasks",
    });
  }

  // 日付の新しい順。日付未定(null)は先頭にまとめる。
  return steps.sort((a, b) => {
    if (a.date === b.date) return a.title.localeCompare(b.title, "ja");
    if (!a.date) return -1;
    if (!b.date) return 1;
    return b.date.localeCompare(a.date);
  });
}
