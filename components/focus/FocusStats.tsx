"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  deleteFocusSession,
  updateFocusSessionTimes,
} from "@/lib/actions/pomodoro";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  FOCUS_CATEGORIES,
  FOCUS_GROUPS,
  type FocusGroupId,
  formatDuration,
  formatJstTime,
  formatPomoEquivalent,
  fromJstInputValue,
  toJstInputValue,
  type FocusCategoryId,
} from "@/lib/focus-categories";
import { addDaysToDateString, formatWeekday } from "@/lib/utils";
import type { FocusSessionEntry } from "@/types";

type Totals = Record<FocusCategoryId, number>;

/** 棒グラフの棒の最大の高さ(px) */
const BAR_AREA_PX = 112;

function emptyTotals(): Totals {
  return { shukatsu: 0, webtest: 0, fe: 0, kokushi: 0, study_other: 0 };
}

function durationSec(s: FocusSessionEntry): number {
  if (!s.ended_at) return 0;
  return Math.max(0, (Date.parse(s.ended_at) - Date.parse(s.started_at)) / 1000);
}

function sum(t: Totals): number {
  return Object.values(t).reduce((a, b) => a + b, 0);
}

function shortDay(day: string): string {
  const [, m, d] = day.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** 時間の目盛り用 "1.5h" / "40m" */
function compactHours(sec: number): string {
  if (sec <= 0) return "";
  const min = sec / 60;
  if (min < 60) return `${Math.round(min)}m`;
  return `${(min / 60).toFixed(1)}h`;
}

function groupSum(t: Totals, group: FocusGroupId): number {
  return FOCUS_CATEGORIES.filter((c) => c.group === group).reduce(
    (a, c) => a + t[c.id],
    0
  );
}

/** 目標に対する進み具合のバー。中身は科目別の色で積み上げる。 */
function GoalBar({
  label,
  group,
  totals,
  goalSec,
}: {
  label: string;
  group: FocusGroupId;
  totals: Totals;
  goalSec: number;
}) {
  const done = groupSum(totals, group);
  const pct = goalSec > 0 ? Math.round((done / goalSec) * 100) : 0;
  let left = goalSec;
  return (
    <div>
      <div
        className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, pct)}
        aria-label={`${label}の目標に対する進み具合`}
      >
        {goalSec > 0 &&
          FOCUS_CATEGORIES.filter((c) => c.group === group).map((c) => {
            const v = Math.min(totals[c.id], Math.max(0, left));
            left -= v;
            return v > 0 ? (
              <div
                key={c.id}
                style={{ width: `${(v / goalSec) * 100}%`, background: c.color }}
              />
            ) : null;
          })}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {goalSec > 0 ? (
          <>
            目標 {formatDuration(goalSec)}（{goalSec / 60 / 25}ポモ分）・
            <span className="font-medium text-foreground">{pct}%</span>
            {done >= goalSec && " 達成！"}
          </>
        ) : (
          "今日の並びに見積もりがありません"
        )}
      </p>
    </div>
  );
}

function CategoryDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ background: color }}
    />
  );
}

/**
 * /focus の見える化: 今日のカテゴリ別合計・目標バー・直近7日の積み上げ棒グラフ・
 * 選んだ日の記録一覧(時刻の修正と削除)。計測中の分もリアルタイムに足し込む。
 */
export function FocusStats({
  sessions,
  active,
  elapsedSec,
  goals,
  today,
  manualEntry,
}: {
  sessions: FocusSessionEntry[];
  active: FocusSessionEntry | null;
  elapsedSec: number;
  /** 就活/勉強それぞれの今日の目標(秒) */
  goals: Record<FocusGroupId, number>;
  today: string;
  manualEntry: ReactNode;
}) {
  const days = Array.from({ length: 7 }, (_, i) =>
    addDaysToDateString(today, i - 6)
  );
  const byDay = new Map<string, Totals>(days.map((d) => [d, emptyTotals()]));
  for (const s of sessions) {
    const t = byDay.get(s.day);
    if (t) t[s.category as FocusCategoryId] += durationSec(s);
  }
  if (active) {
    const t = byDay.get(active.day);
    if (t) t[active.category as FocusCategoryId] += elapsedSec;
  }

  const todayTotals = byDay.get(today) ?? emptyTotals();
  const maxDay = Math.max(...days.map((d) => sum(byDay.get(d)!)), 60 * 60);
  const usedCategories = FOCUS_CATEGORIES.filter((c) =>
    days.some((d) => byDay.get(d)![c.id] > 0)
  );

  const [selectedDay, setSelectedDay] = useState(today);
  const daySessions = sessions.filter((s) => s.day === selectedDay);
  const selectedTotals = byDay.get(selectedDay) ?? emptyTotals();

  return (
    <div className="mb-6 space-y-4">
      {/* 今日: 就活/勉強の2本立て。勉強は科目別の内訳を小さく出す。 */}
      <Card>
        <p className="mb-3 text-sm font-medium text-muted-foreground">今日の合計</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FOCUS_GROUPS.map((g) => {
            const sec = groupSum(todayTotals, g.id);
            const subjects = FOCUS_CATEGORIES.filter(
              (c) =>
                c.group === g.id &&
                g.id === "study" &&
                (c.id !== "study_other" || todayTotals[c.id] > 0)
            );
            return (
              <div key={g.id} className="min-w-0">
                <p className="text-sm font-medium">{g.label}</p>
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-3xl font-bold tabular-nums">
                    {formatDuration(sec)}
                  </span>
                  <span className="text-xs text-muted-foreground opacity-70">
                    {formatPomoEquivalent(sec)}
                  </span>
                </p>
                <div className="mt-2">
                  <GoalBar
                    label={g.label}
                    group={g.id}
                    totals={todayTotals}
                    goalSec={goals[g.id]}
                  />
                </div>
                {subjects.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {subjects.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <CategoryDot color={c.color} />
                        <span className="min-w-0 flex-1 truncate">{c.label}</span>
                        <span
                          className={`tabular-nums ${todayTotals[c.id] > 0 ? "text-foreground" : ""}`}
                        >
                          {formatDuration(todayTotals[c.id])}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* 直近7日 */}
      <Card>
        <p className="mb-2 text-sm font-medium text-muted-foreground">直近7日</p>
        {usedCategories.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {usedCategories.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1">
                <CategoryDot color={c.color} />
                {c.label}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-end gap-1 sm:gap-2">
          {days.map((d) => {
            const t = byDay.get(d)!;
            const total = sum(t);
            const isSelected = d === selectedDay;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDay(d)}
                onMouseEnter={() => setSelectedDay(d)}
                className={`group flex min-w-0 flex-1 flex-col items-center rounded-md px-0.5 pt-1 transition-colors ${
                  isSelected ? "bg-muted" : "hover:bg-muted/60"
                }`}
                aria-label={`${shortDay(d)} 合計${formatDuration(total)}`}
                aria-pressed={isSelected}
              >
                <span className="h-4 text-[10px] tabular-nums text-muted-foreground">
                  {compactHours(total)}
                </span>
                <div
                  className="flex w-full max-w-8 flex-col-reverse gap-[2px]"
                  style={{ height: BAR_AREA_PX }}
                >
                  {FOCUS_CATEGORIES.map((c, i) => {
                    if (t[c.id] <= 0) return null;
                    const isTop = !FOCUS_CATEGORIES.slice(i + 1).some(
                      (n) => t[n.id] > 0
                    );
                    return (
                      <div
                        key={c.id}
                        className={isTop ? "rounded-t" : ""}
                        style={{
                          height: Math.max(2, (t[c.id] / maxDay) * BAR_AREA_PX),
                          flexShrink: 0,
                          background: c.color,
                        }}
                      />
                    );
                  })}
                </div>
                <span
                  className={`mt-1 text-[10px] leading-tight ${d === today ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                >
                  {shortDay(d)}
                  <br />({formatWeekday(d)})
                </span>
              </button>
            );
          })}
        </div>
        {/* 選んだ日の内訳(グラフを数字でも読めるように) */}
        <p className="mt-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {shortDay(selectedDay)}（{formatWeekday(selectedDay)}）
          </span>{" "}
          合計 {formatDuration(sum(selectedTotals))}{" "}
          <span className="opacity-70">{formatPomoEquivalent(sum(selectedTotals))}</span>
          {FOCUS_CATEGORIES.filter((c) => selectedTotals[c.id] > 0).map((c) => (
            <span key={c.id}>
              {" ・ "}
              {c.label} {formatDuration(selectedTotals[c.id])}
            </span>
          ))}
        </p>
      </Card>

      {/* 選んだ日の記録 */}
      <Card>
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          {selectedDay === today
            ? "今日の記録"
            : `${shortDay(selectedDay)}（${formatWeekday(selectedDay)}）の記録`}
        </p>
        {daySessions.length === 0 && !(active && active.day === selectedDay) ? (
          <p className="mb-2 text-sm text-muted-foreground">記録はまだありません。</p>
        ) : (
          <ul className="mb-2 divide-y divide-border">
            {active && active.day === selectedDay && (
              <li className="flex items-center gap-2 py-1.5 text-sm">
                <span className="w-24 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {formatJstTime(active.started_at)}–
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {active.company && `${active.company}・`}
                  {active.label}
                </span>
                <span className="text-xs text-muted-foreground">計測中</span>
              </li>
            )}
            {daySessions.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </ul>
        )}
        {manualEntry}
      </Card>
    </div>
  );
}

/** 記録1行。開始・終了時刻の修正と削除ができる。 */
function SessionRow({ session }: { session: FocusSessionEntry }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const category = FOCUS_CATEGORIES.find((c) => c.id === session.category);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateFocusSessionTimes(
        session.id,
        fromJstInputValue(start),
        fromJstInputValue(end)
      );
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("この記録を削除しますか？")) return;
    setSaving(true);
    try {
      await deleteFocusSession(session.id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="py-1.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-24 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
          {formatJstTime(session.started_at)}–
          {session.ended_at ? formatJstTime(session.ended_at) : ""}
        </span>
        {category && <CategoryDot color={category.color} />}
        <span className="min-w-0 flex-1 truncate">
          {session.company && (
            <span className="text-muted-foreground">{session.company}・</span>
          )}
          {session.label}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatDuration(durationSec(session))}
        </span>
        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStart(toJstInputValue(session.started_at));
              setEnd(toJstInputValue(session.ended_at ?? session.started_at));
              setEditing(true);
            }}
            aria-label="時刻を直す"
          >
            直す
          </Button>
        )}
      </div>
      {editing && (
        <div className="mt-2 space-y-2 rounded-lg border border-border p-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">
              開始
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-0.5 w-full rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              終了
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-0.5 w-full rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={save} disabled={saving || !start || !end}>
              保存
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              キャンセル
            </Button>
            <Button
              size="sm"
              variant="danger"
              className="ml-auto"
              onClick={remove}
              disabled={saving}
            >
              削除
            </Button>
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </li>
  );
}
