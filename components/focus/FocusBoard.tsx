"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { finishPomodoro, startPomodoro } from "@/lib/actions/pomodoro";
import {
  carryOverTask,
  completeTaskWithNote,
  toggleTaskDone,
} from "@/lib/actions/tasks";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { formatDate, isOverdue } from "@/lib/utils";
import type { PomodoroKind, TaskWithCompany } from "@/types";

const FOCUS_MIN = 25;
const SHORT_BREAK_MIN = 5;
const LONG_BREAK_MIN = 15;
const STORAGE_KEY = "atFocusTimer";

type ActiveTimer = {
  sessionId: string;
  taskId: string | null;
  kind: PomodoroKind;
  /** 開始時刻(epoch ms)。残り時間はここから計算するので再読込しても継続する。 */
  startMs: number;
  durationSec: number;
};

function loadActive(): ActiveTimer | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActiveTimer) : null;
  } catch {
    return null;
  }
}
function saveActive(t: ActiveTimer) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  } catch {
    // localStorage が使えない環境でも動作は続ける
  }
}
function clearActiveStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 無視
  }
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function beep() {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.42);
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {
    // 音が出せなくても致命的ではない
  }
}

function notify(kind: PomodoroKind) {
  const body =
    kind === "focus"
      ? "ポモドーロ完了！少し休憩しましょう"
      : "休憩終了！次のポモを始めましょう";
  try {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      new Notification("a.t focus", { body });
    }
  } catch {
    // 通知不可でも続行
  }
  beep();
}

export function FocusBoard({
  tasks,
  completedToday,
  plannedPomos,
}: {
  tasks: TaskWithCompany[];
  completedToday: number;
  plannedPomos: number;
}) {
  const router = useRouter();
  const activeTasks = tasks.filter((t) => !t.is_done);
  const normalTasks = activeTasks.filter((t) => (t.est_pomos ?? 1) > 0);
  const smallTasks = activeTasks.filter((t) => (t.est_pomos ?? 1) === 0);
  // 完了済みは当日のうちは残す(誤操作に気づけるよう取り消し線+戻すボタンで表示)。
  const doneTasks = tasks.filter((t) => t.is_done);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState("");

  const focusCountRef = useRef(completedToday);
  const completingRef = useRef(false);
  const completeRef = useRef<() => void>(() => {});

  const currentTask = normalTasks[currentIndex] ?? null;

  // 再読込・タブ復帰時に、進行中タイマーを開始時刻から復元する。
  useEffect(() => {
    const t = loadActive();
    if (!t) return;
    const elapsed = (Date.now() - t.startMs) / 1000;
    if (elapsed >= t.durationSec) {
      // 離席中に完走していた → 完了として記録し、休憩は開始しない。
      finishPomodoro(t.sessionId, true).finally(() => {
        clearActiveStorage();
        router.refresh();
      });
    } else {
      setActive(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTimer = useCallback(
    async (kind: PomodoroKind) => {
      if (pending) return;
      setPending(true);
      try {
        if (
          kind === "focus" &&
          typeof Notification !== "undefined" &&
          Notification.permission === "default"
        ) {
          try {
            await Notification.requestPermission();
          } catch {
            // 拒否されても続行
          }
        }
        const taskId = currentTask?.id ?? null;
        const session = await startPomodoro(taskId, kind);
        const durationSec =
          (kind === "focus"
            ? FOCUS_MIN
            : kind === "long_break"
              ? LONG_BREAK_MIN
              : SHORT_BREAK_MIN) * 60;
        const timer: ActiveTimer = {
          sessionId: session.id,
          taskId,
          kind,
          startMs: Date.parse(session.started_at),
          durationSec,
        };
        completingRef.current = false;
        saveActive(timer);
        setActive(timer);
      } finally {
        setPending(false);
      }
    },
    [currentTask, pending]
  );

  const handleComplete = useCallback(async () => {
    if (!active || completingRef.current) return;
    completingRef.current = true;
    const finished = active;
    clearActiveStorage();
    setActive(null);
    await finishPomodoro(finished.sessionId, true);
    notify(finished.kind);
    if (finished.kind === "focus") {
      focusCountRef.current += 1;
      const long = focusCountRef.current % 4 === 0;
      await startTimer(long ? "long_break" : "short_break");
    }
    router.refresh();
  }, [active, router, startTimer]);

  completeRef.current = handleComplete;

  // 1秒ごとに残り時間を再計算。0 になったら完了処理へ。
  useEffect(() => {
    if (!active) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      const rem = Math.max(
        0,
        Math.ceil(active.durationSec - (Date.now() - active.startMs) / 1000)
      );
      setRemaining(rem);
      if (rem <= 0) completeRef.current();
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [active]);

  const stop = useCallback(async () => {
    if (!active) return;
    completingRef.current = true;
    const stopped = active;
    clearActiveStorage();
    setActive(null);
    setRemaining(0);
    await finishPomodoro(stopped.sessionId, false);
    completingRef.current = false;
    router.refresh();
  }, [active, router]);

  const completeTask = useCallback(
    async (id: string, withNote: boolean) => {
      setPending(true);
      try {
        await completeTaskWithNote(id, withNote ? note : null);
        setNote("");
        router.refresh();
      } finally {
        setPending(false);
      }
    },
    [note, router]
  );

  const carryOver = useCallback(
    async (id: string, withNote: boolean) => {
      setPending(true);
      try {
        await carryOverTask(id, withNote ? note : null);
        setNote("");
        router.refresh();
      } finally {
        setPending(false);
      }
    },
    [note, router]
  );

  const undoComplete = useCallback(
    async (id: string) => {
      setPending(true);
      try {
        await toggleTaskDone(id, false);
        router.refresh();
      } finally {
        setPending(false);
      }
    },
    [router]
  );

  // 完了数はサーバの真値。ポモ完了ごとに router.refresh() で更新される。
  const doneToday = completedToday;
  const phaseLabel =
    active?.kind === "focus"
      ? "集中中"
      : active?.kind === "long_break"
        ? "長い休憩"
        : active?.kind === "short_break"
          ? "休憩中"
          : "待機中";
  const isBreak = active?.kind === "short_break" || active?.kind === "long_break";

  return (
    <div className="min-h-screen px-4 py-6 sm:py-10 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← a.t
        </Link>
        <div className="text-sm text-muted-foreground">
          今日：完了{" "}
          <span className="font-semibold text-foreground">{doneToday}</span> /
          予定 {plannedPomos} ポモ
        </div>
      </div>

      {/* タイマー */}
      <Card className="mb-6 text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {phaseLabel}
        </p>
        <p
          className={`my-3 font-mono text-6xl font-bold tabular-nums ${
            isBreak ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
          }`}
        >
          {active ? fmt(remaining) : fmt(FOCUS_MIN * 60)}
        </p>
        <p className="mb-4 text-sm text-muted-foreground min-h-5">
          {currentTask ? (
            <>
              {currentTask.is_must && (
                <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 font-semibold mr-1.5">
                  MUST
                </Badge>
              )}
              {currentTask.companies && (
                <Link
                  href={`/companies/${currentTask.companies.id}`}
                  className="text-foreground font-medium hover:underline underline-offset-2"
                >
                  {currentTask.companies.name}
                </Link>
              )}{" "}
              {currentTask.title}
            </>
          ) : (
            "今日の並びにタスクがありません"
          )}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {!active && (
            <Button
              onClick={() => startTimer("focus")}
              disabled={pending || !currentTask}
            >
              ▶ 集中を開始
            </Button>
          )}
          {active && (
            <Button variant="danger" onClick={stop} disabled={pending}>
              ■ 中断
            </Button>
          )}
          {currentTask && normalTasks.length > 1 && (
            <Button
              variant="ghost"
              onClick={() => setCurrentIndex((i) => (i + 1) % normalTasks.length)}
              disabled={pending}
            >
              次へ →
            </Button>
          )}
        </div>

        {currentTask && (
          <div className="mt-4 border-t border-border pt-4">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="完了メモ（任意・1行）"
              className="mb-2"
            />
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="secondary"
                onClick={() => completeTask(currentTask.id, true)}
                disabled={pending}
              >
                ✓ 完了
              </Button>
              <Button
                variant="ghost"
                onClick={() => carryOver(currentTask.id, true)}
                disabled={pending}
              >
                ↩ 持ち越し
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 小タスクまとめ */}
      {smallTasks.length > 0 && (
        <Card className="mb-6">
          <p className="mb-2 text-sm font-medium">
            小タスクまとめ{" "}
            <span className="text-xs text-muted-foreground">
              （10分以内・{smallTasks.length}件）
            </span>
          </p>
          <div className="space-y-1.5">
            {smallTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border cursor-pointer"
                  onChange={() => completeTask(t.id, false)}
                  disabled={pending}
                />
                <span className="flex-1 min-w-0">
                  {t.is_must && (
                    <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 font-semibold mr-1.5">
                      MUST
                    </Badge>
                  )}
                  {t.companies && (
                    <Link
                      href={`/companies/${t.companies.id}`}
                      className="text-muted-foreground hover:text-foreground hover:underline underline-offset-2"
                    >
                      {t.companies.name}
                    </Link>
                  )}
                  {t.companies && "・"}
                  {t.title}
                </span>
                {t.deadline && (
                  <span
                    className={`text-xs ${isOverdue(t.deadline, t.is_done) ? "text-red-600" : "text-muted-foreground"}`}
                  >
                    {formatDate(t.deadline)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 今日の並び */}
      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          今日の並び（{normalTasks.length}件）
        </p>
        {normalTasks.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">
              ポモを割り当てたタスクはまだありません。
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {normalTasks.map((t, i) => (
              <Card
                key={t.id}
                hover
                className={`cursor-pointer ${i === currentIndex ? "ring-2 ring-accent" : ""} ${
                  t.is_must && !t.is_done ? "border-2 border-red-500" : ""
                }`}
                onClick={() => setCurrentIndex(i)}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-xs font-mono text-muted-foreground w-5 text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {t.companies && (
                        <Link
                          href={`/companies/${t.companies.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-foreground hover:underline underline-offset-2"
                        >
                          {t.companies.name}
                        </Link>
                      )}
                      {t.companies && "・"}
                      {t.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {t.is_must && !t.is_done && (
                        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 font-semibold">
                          MUST
                        </Badge>
                      )}
                      <Badge className="bg-muted text-muted-foreground">
                        {t.est_pomos ?? 1} ポモ
                      </Badge>
                      {t.deadline && (
                        <span
                          className={`text-xs ${isOverdue(t.deadline, t.is_done) ? "text-red-600 font-medium" : "text-muted-foreground"}`}
                        >
                          {formatDate(t.deadline)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        completeTask(t.id, false);
                      }}
                      disabled={pending}
                    >
                      完了
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        carryOver(t.id, false);
                      }}
                      disabled={pending}
                    >
                      持ち越し
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 完了（今日）: 誤操作に気づけるよう、当日は取り消し線で残して戻せるようにする */}
      {doneTasks.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            完了（今日・{doneTasks.length}件）
          </p>
          <div className="space-y-1.5">
            {doneTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 text-sm opacity-60"
              >
                <span className="flex-1 min-w-0 line-through">
                  {t.companies && (
                    <span className="text-muted-foreground">
                      {t.companies.name}・
                    </span>
                  )}
                  {t.title}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => undoComplete(t.id)}
                  disabled={pending}
                >
                  元に戻す
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
