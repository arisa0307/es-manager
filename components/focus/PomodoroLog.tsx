import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatWeekday, getFocusDayString } from "@/lib/utils";
import type { PomodoroLogEntry } from "@/types";

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fullLabel(e: PomodoroLogEntry): string {
  return e.company ? `${e.company}・${e.label}` : e.label;
}

/** 完了ポモを対象ごとに数え、多い順に並べる。 */
function countByLabel(entries: PomodoroLogEntry[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (!e.completed) continue;
    const key = fullLabel(e);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * /focus のポモ記録。今日の集中セッション一覧(中断含む)と、
 * 直近の日ごとの完了数・対象別内訳を出す。
 */
export function PomodoroLog({ entries }: { entries: PomodoroLogEntry[] }) {
  const today = getFocusDayString();
  const todayEntries = entries.filter((e) => e.day === today);
  const todayCounts = countByLabel(todayEntries);

  const pastDays = [...new Set(entries.map((e) => e.day))]
    .filter((d) => d !== today)
    .sort((a, b) => b.localeCompare(a));

  return (
    <div className="mt-8">
      <p className="mb-2 text-sm font-medium text-muted-foreground">
        ポモ記録（今日）
      </p>
      <Card>
        {todayEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            今日はまだタイマーでポモを回していません。
          </p>
        ) : (
          <>
            {todayCounts.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {todayCounts.map(([label, n]) => (
                  <Badge key={label} className="bg-muted text-foreground">
                    {label} × {n}
                  </Badge>
                ))}
              </div>
            )}
            <ul className="space-y-1.5">
              {todayEntries.map((e) => (
                <li key={e.id} className="flex items-center gap-2 text-sm">
                  <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                    {fmtTime(e.started_at)}–{e.ended_at ? fmtTime(e.ended_at) : ""}
                  </span>
                  <span
                    className={`flex-1 min-w-0 truncate ${e.completed ? "" : "text-muted-foreground"}`}
                  >
                    {fullLabel(e)}
                  </span>
                  {!e.completed && (
                    <Badge className="bg-muted text-muted-foreground">中断</Badge>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {pastDays.length > 0 && (
        <details className="mt-4 group">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            過去のポモ記録（{pastDays.length}日分）
          </summary>
          <div className="mt-2 space-y-2">
            {pastDays.map((day) => {
              const dayEntries = entries.filter((e) => e.day === day);
              const counts = countByLabel(dayEntries);
              const total = counts.reduce((s, [, n]) => s + n, 0);
              return (
                <Card key={day}>
                  <p className="mb-1.5 text-sm font-medium">
                    {day.slice(5).replace("-", "/")}（{formatWeekday(day)}）
                    <span className="ml-2 text-xs text-muted-foreground">
                      完了 {total} ポモ
                    </span>
                  </p>
                  {counts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      完了したポモはありません（中断のみ）
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {counts.map(([label, n]) => (
                        <Badge key={label} className="bg-muted text-foreground">
                          {label} × {n}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
