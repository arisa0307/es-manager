"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateCompany } from "@/lib/actions/companies";
import { deleteCompanyEvent } from "@/lib/actions/company-events";
import { deleteTask } from "@/lib/actions/tasks";
import { Badge } from "@/components/ui/Badge";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import { Card } from "@/components/ui/Card";
import {
  formatDateFull,
  formatScheduleDaysLabel,
  formatWeekday,
  isOverdue,
} from "@/lib/utils";
import type { ScheduleItem } from "@/types";

export function CompanyUpcomingSchedule({ items }: { items: ScheduleItem[] }) {
  const today = new Date().toISOString().split("T")[0];
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = (item: ScheduleItem) => {
    if (!item.deleteId) return;
    const message =
      item.kind === "company_deadline"
        ? "エントリー締切を削除しますか？"
        : item.kind === "task"
          ? `タスク「${item.title}」を削除しますか？`
          : `予定「${item.title}」を削除しますか？`;
    if (!confirm(message)) return;

    startTransition(async () => {
      if (item.kind === "company_event") {
        await deleteCompanyEvent(item.deleteId!);
      } else if (item.kind === "task") {
        await deleteTask(item.deleteId!);
      } else if (item.kind === "company_deadline") {
        await updateCompany(item.deleteId!, { deadline: null });
      }
      router.refresh();
    });
  };

  return (
    <Card className="border-accent/30 bg-accent/5 shadow-sm">
      <div className="mb-3">
        <h2 className="text-sm font-medium text-foreground">予定一覧（近い順）</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          締切・面接・インターン・説明会・タスクなど
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2 text-center">
          予定・期限付きタスクがありません
        </p>
      ) : (
        <ul className={`space-y-2 ${isPending ? "opacity-60" : ""}`}>
          {items.map((item) => {
            const overdue =
              item.kind === "task"
                ? isOverdue(item.date, false)
                : item.date < today;
            const daysLabel = formatScheduleDaysLabel(item.date, today);

            return (
              <li
                key={item.id}
                className="flex items-stretch gap-1 rounded-lg border border-border bg-card transition-colors hover:bg-muted/30"
              >
                <a
                  href={item.href}
                  className="flex min-w-0 flex-1 items-start gap-3 px-3 py-2.5"
                >
                  <div className="shrink-0 w-20 text-right">
                    <p
                      className={`text-xs font-medium ${
                        overdue ? "text-red-600" : "text-accent"
                      }`}
                    >
                      {daysLabel}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDateFull(item.date)}
                      {item.time && ` ${item.time}`}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      （{formatWeekday(item.date)}）
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={getScheduleColor(item.kind)}>
                        {item.label}
                      </Badge>
                      <span className="text-sm font-medium truncate">
                        {item.title}
                      </span>
                    </div>
                    {item.memo && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        <LinkifiedText text={item.memo} />
                      </p>
                    )}
                  </div>
                </a>
                {item.deleteId && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={isPending}
                    aria-label={`${item.title} を削除`}
                    title="削除"
                    className="shrink-0 px-2.5 text-muted-foreground transition-colors hover:text-red-600 disabled:opacity-50"
                  >
                    ✕
                  </button>
                )}
              </li>
            );
          })}
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
