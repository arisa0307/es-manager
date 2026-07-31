import { Card } from "@/components/ui/Card";
import type { StageStat } from "@/lib/actions/stats";

type Row = StageStat & { decided: number; rate: number | null };

function toRow(s: StageStat): Row {
  const decided = s.passed + s.failed;
  return { ...s, decided, rate: decided > 0 ? s.passed / decided : null };
}

function StatBar({ row, small = false }: { row: Row; small?: boolean }) {
  const pct = row.rate === null ? null : Math.round(row.rate * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className={small ? "text-muted-foreground" : "font-medium text-foreground"}>
          {row.stage}
        </span>
        <span className="text-muted-foreground">
          {pct === null ? (
            "—"
          ) : (
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {pct}%
            </span>
          )}
          <span className="ml-1.5">
            通過{row.passed}/決着{row.decided}
            {row.waiting > 0 && ` ・待ち${row.waiting}`}
          </span>
        </span>
      </div>
      <div className={`overflow-hidden rounded-full bg-muted-foreground/15 ${small ? "h-1.5" : "h-2"}`}>
        {pct !== null && (
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
        )}
      </div>
    </div>
  );
}

export function SelectionFunnel({
  stats,
  interviewRounds = [],
}: {
  stats: StageStat[];
  interviewRounds?: StageStat[];
}) {
  const rows = stats.map(toRow);
  const roundRows = interviewRounds.map(toRow);
  const hasAny = rows.some((r) => r.decided > 0 || r.waiting > 0);

  return (
    <Card className="p-0">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden">
          <div>
            <h2 className="text-sm font-medium text-foreground">選考の通過率</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              タップで展開。バーは通過率（通過÷決着した数）
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground transition-transform group-open:rotate-90">
            ▶
          </span>
        </summary>

        <div className="px-4 pb-4">
          {!hasAny ? (
            <p className="py-2 text-sm text-muted-foreground">
              まだ結果の記録がありません。ES提出・予定・タスクに「結果」を入れると集計されます。
            </p>
          ) : (
            <div className="space-y-2.5">
              {rows.map((r) =>
                r.stage === "面接" && roundRows.length > 0 ? (
                  <details key={r.stage} className="group/round">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 [&::-webkit-details-marker]:hidden">
                      <span className="text-[10px] text-muted-foreground transition-transform group-open/round:rotate-90">
                        ▶
                      </span>
                      <div className="flex-1">
                        <StatBar row={r} />
                      </div>
                    </summary>
                    <div className="mt-2 space-y-2 border-l border-border pl-3">
                      {roundRows.map((rr) => (
                        <StatBar key={rr.stage} row={rr} small />
                      ))}
                    </div>
                  </details>
                ) : (
                  <StatBar key={r.stage} row={r} />
                )
              )}
            </div>
          )}
        </div>
      </details>
    </Card>
  );
}
