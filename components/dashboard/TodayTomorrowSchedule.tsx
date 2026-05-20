import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDateFull, formatWeekday } from "@/lib/utils";
import type { ScheduleItem } from "@/types";

export function TodayTomorrowSchedule({
  today,
  tomorrow,
  todayItems,
  tomorrowItems,
}: {
  today: string;
  tomorrow: string;
  todayItems: ScheduleItem[];
  tomorrowItems: ScheduleItem[];
}) {
  return (
    <section>
      <div className="flex justify-between mb-3">
        <h2 className="text-sm font-medium">今日・明日の予定</h2>
        <Link href="/calendar" className="text-xs text-muted-foreground hover:underline">
          カレンダー →
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <DaySchedule
          label="今日"
          date={today}
          items={todayItems}
        />
        <DaySchedule
          label="明日"
          date={tomorrow}
          items={tomorrowItems}
        />
      </div>
    </section>
  );
}

function DaySchedule({
  label,
  date,
  items,
}: {
  label: string;
  date: string;
  items: ScheduleItem[];
}) {
  return (
    <Card className="border-accent/20">
      <div className="mb-3">
        <p className="text-xs font-medium text-accent">{label}</p>
        <p className="text-sm text-muted-foreground">
          {formatDateFull(date)}（{formatWeekday(date)}）
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">予定なし</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="block rounded-md border border-border bg-muted/20 px-3 py-2 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Badge className={getScheduleColor(item.kind)}>{item.label}</Badge>
                  <span className="text-sm font-medium truncate">{item.title}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function getScheduleColor(kind: ScheduleItem["kind"]): string {
  switch (kind) {
    case "general":
      return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "company_event":
      return "bg-pink-500/10 text-pink-700 dark:text-pink-300";
    case "company_deadline":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "task":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
}
