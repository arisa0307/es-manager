import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDate, getSelectionResultColor } from "@/lib/utils";
import type { SelectionStep } from "@/lib/company-selection";

/**
 * 予定(日付あり)とタスク(日付未定)の選考結果を、企業ページで1つにまとめて表示する。
 */
export function CompanySelectionResults({ steps }: { steps: SelectionStep[] }) {
  return (
    <Card>
      <div className="mb-3">
        <h2 className="text-sm font-medium text-foreground">選考の結果</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          予定・タスクの両方から、結果を記録したものをまとめています
        </p>
      </div>

      {steps.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          まだ結果の記録がありません。予定・日程やタスクの「結果」を設定すると、ここに並びます。
        </p>
      ) : (
        <ul className="space-y-2">
          {steps.map((step) => (
            <li key={step.id}>
              <a
                href={step.href}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 transition-colors hover:bg-muted/40"
              >
                <Badge
                  className={
                    step.source === "task"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      : step.source === "es"
                        ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                        : "bg-muted text-muted-foreground"
                  }
                >
                  {step.label}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {step.title}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {step.date ? formatDate(step.date) : "日付なし"}
                </span>
                <Badge className={getSelectionResultColor(step.result)}>
                  {step.result}
                </Badge>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
