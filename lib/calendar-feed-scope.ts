import type { CompanyEventType } from "@/types";

/**
 * Macカレンダーなどの色はカレンダー単位でしか持てず、iCal で予定ごとの色は
 * 指定できない。重要な予定を色分けするため、購読フィードを分割できるようにする。
 * scope なしの URL は従来どおり全予定を返す。
 */
export type CalendarFeedScope = "all" | "important" | "other";

/** 重要な予定として別カレンダーに出す企業イベントの種別 */
const IMPORTANT_COMPANY_EVENT_TYPES: readonly CompanyEventType[] = [
  "interview",
  "gd",
  "internship",
];

export function parseCalendarFeedScope(value: string | null): CalendarFeedScope {
  return value === "important" || value === "other" ? value : "all";
}

/** 候補日はまだ確定していないので、重要な予定には含めない */
export function isImportantCompanyEntry(
  type: CompanyEventType,
  entry: { isCandidate: boolean }
) {
  return !entry.isCandidate && IMPORTANT_COMPANY_EVENT_TYPES.includes(type);
}

export function getCalendarFeedName(scope: CalendarFeedScope) {
  return scope === "important" ? "a.t 重要予定" : "a.t 就活予定";
}
