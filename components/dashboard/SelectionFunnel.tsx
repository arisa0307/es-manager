import { Card } from "@/components/ui/Card";
import type { StageStat } from "@/lib/actions/stats";

type Row = StageStat & {
  decided: number;
  rate: number | null;
};

export function SelectionFunnel({ stats }: { stats: StageStat[] }) {
  const rows: Row[] = stats.map((s) => {
    const decided = s.passed + s.failed;
    return { ...s, decided, rate: decided > 0 ? s.passed / decided : null };
  });

  const hasAny = rows.some((r) => r.decided > 0 || r.waiting > 0);

  // 決着が2件以上あるステージの中で、通過率が最も低い所をボトルネックとして強調
  const bottleneck = rows
    .filter((r) => r.decided >= 2 && r.rate !== null)
    .sort((a, b) => a.rate! - b.rate!)[0];

  return (
    <Card className="p-0">
      {/* 既定は畳んでおき、見たいときだけ開く（通過率が低くても普段は目に入らないように） */}
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden">
          <div>
            <h2 className="text-sm font-medium text-foreground">選考の通過率</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              タップで展開。ステップごとの弱点を確認できます
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground transition-transform group-open:rotate-90">
            ▶
          </span>
        </summary>

        <div className="px-4 pb-4">
          {!hasAny ? (
            <p className="py-2 text-sm text-muted-foreground">
              まだ結果の記録がありません。ES・予定・タスクに「結果」を入れると集計されます。
            </p>
          ) : (
            <div className="space-y-2.5">
              {rows.map((r) => {
                const isBottleneck = bottleneck && r.stage === bottleneck.stage;
                const pct = r.rate === null ? null : Math.round(r.rate * 100);
                return (
                  <div key={r.stage}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        {r.stage}
                        {isBottleneck && (
                          <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                            要改善
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        {pct === null ? (
                          "—"
                        ) : (
                          <span className="font-semibold text-foreground">
                            {pct}%
                          </span>
                        )}
                        <span className="ml-1.5">
                          通過{r.passed}/決着{r.decided}
                          {r.waiting > 0 && ` ・待ち${r.waiting}`}
                        </span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted-foreground/15">
                      {pct !== null && (
                        <div
                          className={`h-full rounded-full ${
                            isBottleneck ? "bg-red-400" : "bg-emerald-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </details>
    </Card>
  );
}
