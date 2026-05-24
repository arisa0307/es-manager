import type {
  CompanyStatus,
  DesiredLevel,
  TaskPriority,
  CompanySortField,
} from "@/types";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date + "T00:00:00").toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

export function formatDateFull(date: string | null): string {
  if (!date) return "—";
  return new Date(date + "T00:00:00").toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function isOverdue(deadline: string | null, isDone: boolean): boolean {
  if (!deadline || isDone) return false;
  return deadline < getTodayString();
}

export function countWords(text: string | null): number {
  if (!text) return 0;
  return text.length;
}

export function parseTags(input: string): string[] {
  return input
    .split(/[,、]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function formatTags(tags: string[] | null): string {
  return tags?.join(", ") ?? "";
}

const STATUS_COLORS: Record<CompanyStatus, string> = {
  未エントリー: "bg-muted text-muted-foreground",
  マイページ登録済み: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  ES: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Webテスト: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  面接: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  内定: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  落選: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export function getStatusColor(status: CompanyStatus): string {
  return STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";
}

const LEVEL_COLORS: Record<DesiredLevel, string> = {
  S: "bg-red-500/10 text-red-700 dark:text-red-400 font-semibold",
  A: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  B: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  C: "bg-muted text-muted-foreground",
};

export function getLevelColor(level: DesiredLevel | null): string {
  if (!level) return "bg-muted text-muted-foreground";
  return LEVEL_COLORS[level];
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400",
  mid: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  low: "bg-muted text-muted-foreground",
};

export function getPriorityColor(priority: TaskPriority): string {
  return PRIORITY_COLORS[priority];
}

const LEVEL_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };
const STATUS_ORDER: Record<string, number> = {
  未エントリー: 0,
  マイページ登録済み: 1,
  ES: 2,
  Webテスト: 3,
  面接: 4,
  内定: 5,
  落選: 6,
};

export function sortCompanies<T extends {
  name: string;
  deadline: string | null;
  desired_level: DesiredLevel | null;
  status: CompanyStatus;
  updated_at: string;
}>(
  items: T[],
  field: CompanySortField,
  order: "asc" | "desc"
): T[] {
  const dir = order === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "name":
        cmp = a.name.localeCompare(b.name, "ja");
        break;
      case "deadline":
        cmp = (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999");
        break;
      case "desired_level":
        cmp =
          (LEVEL_ORDER[a.desired_level ?? "C"] ?? 9) -
          (LEVEL_ORDER[b.desired_level ?? "C"] ?? 9);
        break;
      case "status":
        cmp =
          (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
        break;
      case "updated_at":
        cmp = a.updated_at.localeCompare(b.updated_at);
        break;
    }
    return cmp * dir;
  });
}

export function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const days: (number | null)[] = [];

  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);

  return days;
}

/** 日本時間の「今日」（YYYY-MM-DD） */
export function getTodayString(timeZone = "Asia/Tokyo"): string {
  return new Date().toLocaleDateString("en-CA", { timeZone });
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().split("T")[0];
}

export function formatWeekday(date: string | null): string {
  if (!date) return "";
  return new Date(date + "T00:00:00").toLocaleDateString("ja-JP", {
    weekday: "short",
  });
}

export function formatEventDateTime(
  date: string | null,
  time: string | null | undefined
): string {
  const dateLabel = formatDateFull(date);
  if (!time) return dateLabel;
  return `${dateLabel} ${time}`;
}

export function parseEventTimeFromForm(form: FormData, name = "event_time"): string | null {
  const value = (form.get(name) as string)?.trim();
  return value || null;
}

export function formatScheduleDaysLabel(date: string, today?: string): string {
  const base = today ?? new Date().toISOString().split("T")[0];
  const target = new Date(date + "T00:00:00");
  const now = new Date(base + "T00:00:00");
  const diff = Math.round(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diff < 0) return `期限切れ（${-diff}日前）`;
  if (diff === 0) return "今日";
  if (diff === 1) return "明日";
  return `あと${diff}日`;
}
