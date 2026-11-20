"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import {
  addManualFocusSession,
  startFocusSession,
  stopFocusSession,
} from "@/lib/actions/pomodoro";
import {
  carryOverTask,
  completeTaskWithNote,
  toggleTaskDone,
} from "@/lib/actions/tasks";
import { FocusStats } from "@/components/focus/FocusStats";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  formatDuration,
  formatElapsed,
  formatJstTime,
  formatPomoEquivalent,
  fromJstInputValue,
  toJstInputValue,
  type FocusGroupId,
} from "@/lib/focus-categories";
import { formatDate, isOverdue } from "@/lib/utils";
import {
  FOCUS_FIXED_SUBJECTS,
  type FocusFixedSubject,
  type FocusSessionEntry,
  type FocusTargetInput,
  type TaskWithCompany,
} from "@/types";

/** 計測が長すぎるとき「まだ続けていますか？」を出す間隔 */
const LONG_SESSION_SEC = 3 * 60 * 60;
const LONG_ACK_KEY = "atFocusLongAck";

/** 計測の対象。今日の並び以外のタスクや、固定の対象も選べる。 */
type FocusTarget =
  | { type: "task"; task: TaskWithCompany }
  | { type: "subject"; subject: FocusFixedSubject };

function targetKey(t: FocusTarget): string {
  return t.type === "task" ? `task:${t.task.id}` : `subject:${t.subject}`;
}

function toInput(t: FocusTarget): FocusTargetInput {
  return t.type === "task" ? { taskId: t.task.id } : { subject: t.subject };
}

function taskLabel(t: TaskWithCompany): string {
  return t.companies ? `${t.companies.name}・${t.title}` : t.title;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "失敗しました";
}

/** 止め忘れ確認を「続けている」で閉じたときの経過秒数(セッションごと)。 */
function loadLongAck(sessionId: string): number {
  try {
    const raw = localStorage.getItem(LONG_ACK_KEY);
    const v = raw ? (JSON.parse(raw) as { id: string; sec: number }) : null;
    return v && v.id === sessionId ? v.sec : 0;
  } catch {
    return 0;
  }
}
function saveLongAck(sessionId: string, sec: number) {
  try {
    localStorage.setItem(LONG_ACK_KEY, JSON.stringify({ id: sessionId, sec }));
  } catch {
    // 保存できなくても画面上は閉じる
  }
}

/** 対象を選ぶ <select>。計測と手入力で共用。 */
function TargetSelect({
  id,
  value,
  onChange,
  disabled,
  planned,
  others,
}: {
  id: string;
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
  planned: TaskWithCompany[];
  others: TaskWithCompany[];
}) {
  return (
    <Select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {planned.length > 0 && (
        <optgroup label="今日の並び">
          {planned.map((t) => (
            <option key={t.id} value={`task:${t.id}`}>
              {taskLabel(t)}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label="いつでも">
        {FOCUS_FIXED_SUBJECTS.map((s) => (
          <option key={s} value={`subject:${s}`}>
            {s}
          </option>
        ))}
      </optgroup>
      {others.length > 0 && (
        <optgroup label="その他の未完了タスク">
          {others.map((t) => (
            <option key={t.id} value={`task:${t.id}`}>
              {taskLabel(t)}
            </option>
          ))}
        </optgroup>
      )}
    </Select>
  );
}

export function FocusBoard({
  tasks,
  openTasks,
  sessions,
  active,
  taskTotals,
  goals,
  today,
}: {
  tasks: TaskWithCompany[];
  openTasks: TaskWithCompany[];
  sessions: FocusSessionEntry[];
  active: FocusSessionEntry | null;
  taskTotals: Record<string, number>;
  goals: Record<FocusGroupId, number>;
  today: string;
}) {
  const router = useRouter();
  // 楽観的更新: 完了/持ち越し/戻すをクリック直後に反映し、サーバ往復を待たせない。
  const [, startTaskTransition] = useTransition();
  type FocusAction =
    | { type: "complete" | "undo"; id: string; done: boolean }
    | { type: "carry"; id: string };
  const [optimisticTasks, applyTaskOptimistic] = useOptimistic(
    tasks,
    (state: TaskWithCompany[], action: FocusAction) => {
      if (action.type === "carry") return state.filter((t) => t.id !== action.id);
      return state.map((t) =>
        t.id === action.id ? { ...t, is_done: action.done } : t
      );
    }
  );
  const activeTasks = optimisticTasks.filter((t) => !t.is_done);
  const normalTasks = activeTasks.filter((t) => (t.est_pomos ?? 1) > 0);
  const smallTasks = activeTasks.filter((t) => (t.est_pomos ?? 1) === 0);
  // 完了済みは当日のうちは残す(誤操作に気づけるよう取り消し線+戻すボタンで表示)。
  const doneTasks = optimisticTasks.filter((t) => t.is_done);

  const plannedIds = new Set(optimisticTasks.map((t) => t.id));
  const otherTasks = [
    ...smallTasks,
    ...openTasks.filter((t) => !plannedIds.has(t.id)),
  ];

  // 選択中の対象のキー("task:<id>" / "subject:<ラベル>")。null なら既定(並びの先頭)。
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  // 現在時刻。SSR とずれないよう、マウント後に入れてから毎秒更新する。
  const [now, setNow] = useState<number | null>(null);
  const [longAck, setLongAck] = useState(0);
  const [stopAtOpen, setStopAtOpen] = useState(false);
  const [stopAt, setStopAt] = useState("");

  const resolveTarget = (key: string | null): FocusTarget | null => {
    if (key?.startsWith("subject:")) {
      const subject = key.slice("subject:".length);
      if ((FOCUS_FIXED_SUBJECTS as readonly string[]).includes(subject)) {
        return { type: "subject", subject: subject as FocusFixedSubject };
      }
    } else if (key?.startsWith("task:")) {
      const id = key.slice("task:".length);
      const task =
        activeTasks.find((t) => t.id === id) ??
        otherTasks.find((t) => t.id === id);
      if (task) return { type: "task", task };
    }
    return null;
  };
  // 選んだタスクが完了・持ち越しで消えたら、並びの先頭(なければ固定の先頭)に戻す。
  const target: FocusTarget =
    resolveTarget(selectedKey) ??
    (normalTasks[0]
      ? { type: "task", task: normalTasks[0] }
      : { type: "subject", subject: FOCUS_FIXED_SUBJECTS[0] });
  const currentKey = targetKey(target);
  const currentPlanIndex =
    target.type === "task"
      ? normalTasks.findIndex((t) => t.id === target.task.id)
      : -1;

  // 計測中なら、完了/持ち越しの対象は計測中のタスクにする。
  const actionTask: TaskWithCompany | null = active
    ? active.task_id
      ? (activeTasks.find((t) => t.id === active.task_id) ??
        otherTasks.find((t) => t.id === active.task_id) ??
        null)
      : null
    : target.type === "task"
      ? target.task
      : null;
  const actionTaskPlanned =
    !!actionTask && normalTasks.some((t) => t.id === actionTask.id);

  const elapsedSec =
    active && now !== null
      ? Math.max(0, (now - Date.parse(active.started_at)) / 1000)
      : 0;

  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    setLongAck(active ? loadLongAck(active.id) : 0);
    setStopAtOpen(false);
  }, [active]);

  // 別の端末で開始/終了したときに追従できるよう、タブに戻ったら取り直す。
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  const showLongWarning =
    !!active && elapsedSec - longAck >= LONG_SESSION_SEC;

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      if (pending) return;
      setPending(true);
      setError(null);
      try {
        await fn();
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setPending(false);
        router.refresh();
      }
    },
    [pending, router]
  );

  const start = () => run(() => startFocusSession(toInput(target)));
  const stop = (endedAt?: string) =>
    active ? run(() => stopFocusSession(active.id, endedAt)) : undefined;

  /** 計測中のタスクを完了/持ち越しするときは、先に計測を終える。 */
  const stopIfMeasuring = async (taskId: string) => {
    if (active && active.task_id === taskId) {
      await stopFocusSession(active.id);
    }
  };

  const completeTask = (id: string, withNote: boolean) => {
    const n = withNote ? note : null;
    setPending(true);
    setError(null);
    startTaskTransition(async () => {
      applyTaskOptimistic({ type: "complete", id, done: true });
      setNote("");
      try {
        await stopIfMeasuring(id);
        await completeTaskWithNote(id, n);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setPending(false);
        router.refresh();
      }
    });
  };

  const carryOver = (id: string, withNote: boolean) => {
    const n = withNote ? note : null;
    setPending(true);
    setError(null);
    startTaskTransition(async () => {
      applyTaskOptimistic({ type: "carry", id });
      setNote("");
      try {
        await stopIfMeasuring(id);
        await carryOverTask(id, n);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setPending(false);
        router.refresh();
      }
    });
  };

  const undoComplete = (id: string) => {
    setPending(true);
    startTaskTransition(async () => {
      applyTaskOptimistic({ type: "undo", id, done: false });
      try {
        await toggleTaskDone(id, false);
      } finally {
        setPending(false);
        router.refresh();
      }
    });
  };

  const totalFor = (taskId: string) =>
    (taskTotals[taskId] ?? 0) + (active?.task_id === taskId ? elapsedSec : 0);

  const todaySec =
    sessions
      .filter((s) => s.day === today && s.ended_at)
      .reduce(
        (sum, s) =>
          sum + (Date.parse(s.ended_at!) - Date.parse(s.started_at)) / 1000,
        0
      ) + (active && active.day === today ? elapsedSec : 0);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-lg font-semibold">集中</h1>
        <div className="text-sm text-muted-foreground">
          今日{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {formatDuration(todaySec)}
          </span>{" "}
          <span className="text-xs opacity-70">
            {formatPomoEquivalent(todaySec)}
          </span>
        </div>
      </div>

      {error && (
        <Card className="mb-4 border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      {/* ストップウォッチ */}
      <Card className="mb-6 text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {active ? `計測中・${formatJstTime(active.started_at)} から` : "待機中"}
        </p>
        <p
          className={`my-3 font-mono text-5xl sm:text-6xl font-bold tabular-nums ${
            active ? "text-foreground" : "text-muted-foreground/60"
          }`}
          aria-live="off"
        >
          {active ? (now === null ? "–:––" : formatElapsed(elapsedSec)) : "0:00"}
        </p>

        {active ? (
          <p className="mb-4 text-sm min-h-5">
            {active.company && (
              <span className="text-muted-foreground">{active.company}・</span>
            )}
            <span className="font-medium">{active.label}</span>
          </p>
        ) : (
          <div className="mx-auto mb-4 max-w-md text-left">
            <label
              htmlFor="focus-target"
              className="mb-1 block text-xs text-muted-foreground"
            >
              計測する対象
            </label>
            <TargetSelect
              id="focus-target"
              value={currentKey}
              onChange={setSelectedKey}
              disabled={pending}
              planned={normalTasks}
              others={otherTasks}
            />
          </div>
        )}

        {showLongWarning && active && (
          <div className="mx-auto mb-4 max-w-md rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-left text-sm">
            <p className="font-medium">
              ⚠ 計測が{formatDuration(elapsedSec)}続いています。まだ続けていますか？
            </p>
            {!stopAtOpen ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    saveLongAck(active.id, elapsedSec);
                    setLongAck(elapsedSec);
                  }}
                >
                  続けている
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setStopAt(toJstInputValue(new Date().toISOString()));
                    setStopAtOpen(true);
                  }}
                >
                  終了時刻を指定して終える
                </Button>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label htmlFor="focus-stop-at" className="text-xs text-muted-foreground">
                  実際に終えた時刻
                </label>
                <input
                  id="focus-stop-at"
                  type="datetime-local"
                  value={stopAt}
                  min={toJstInputValue(active.started_at)}
                  onChange={(e) => setStopAt(e.target.value)}
                  className="rounded-md border border-border bg-card px-2 py-1 text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => stopAt && stop(fromJstInputValue(stopAt))}
                  disabled={pending || !stopAt}
                >
                  この時刻で終了
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setStopAtOpen(false)}>
                  戻る
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          {!active ? (
            <Button onClick={start} disabled={pending}>
              ▶ 開始
            </Button>
          ) : (
            <Button variant="danger" onClick={() => stop()} disabled={pending}>
              ■ 終了
            </Button>
          )}
          {!active && normalTasks.length > 1 && (
            <Button
              variant="ghost"
              onClick={() => {
                const next =
                  normalTasks[(currentPlanIndex + 1) % normalTasks.length];
                setSelectedKey(`task:${next.id}`);
              }}
              disabled={pending}
            >
              次へ →
            </Button>
          )}
        </div>

        {actionTask && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2 text-xs text-muted-foreground">
              {taskLabel(actionTask)}
              {totalFor(actionTask.id) > 0 &&
                `（累計 ${formatDuration(totalFor(actionTask.id))}）`}
            </p>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="完了メモ（任意・1行）"
              className="mb-2"
            />
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="secondary"
                onClick={() => completeTask(actionTask.id, true)}
                disabled={pending}
              >
                ✓ 完了
              </Button>
              {actionTaskPlanned && (
                <Button
                  variant="ghost"
                  onClick={() => carryOver(actionTask.id, true)}
                  disabled={pending}
                >
                  ↩ 持ち越し
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      <FocusStats
        sessions={sessions}
        active={active}
        elapsedSec={elapsedSec}
        goals={goals}
        today={today}
        manualEntry={
          <ManualEntryForm
            planned={normalTasks}
            others={otherTasks}
            defaultKey={currentKey}
            onError={setError}
          />
        }
      />

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
              見積もりを入れたタスクはまだありません。
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {normalTasks.map((t, i) => {
              const total = totalFor(t.id);
              const selected = active
                ? active.task_id === t.id
                : target.type === "task" && target.task.id === t.id;
              return (
                <Card
                  key={t.id}
                  hover
                  className={`cursor-pointer ${selected ? "ring-2 ring-accent" : ""} ${
                    t.is_must && !t.is_done ? "border-2 border-red-500" : ""
                  }`}
                  onClick={() => {
                    if (!active) setSelectedKey(`task:${t.id}`);
                  }}
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
                          見積 {t.est_pomos ?? 1} ポモ
                        </Badge>
                        {total > 0 && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            累計 {formatDuration(total)}
                          </span>
                        )}
                        {t.deadline && (
                          <span
                            className={`text-xs ${isOverdue(t.deadline, t.is_done) ? "text-red-600 font-medium" : "text-muted-foreground"}`}
                          >
                            {formatDate(t.deadline)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row">
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
              );
            })}
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
                {totalFor(t.id) > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDuration(totalFor(t.id))}
                  </span>
                )}
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

/** 測り忘れた分を「〇〇を△分やった」で追加するフォーム。 */
function ManualEntryForm({
  planned,
  others,
  defaultKey,
  onError,
}: {
  planned: TaskWithCompany[];
  others: TaskWithCompany[];
  defaultKey: string;
  onError: (msg: string | null) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(defaultKey);
  const [minutes, setMinutes] = useState("30");
  const [endAt, setEndAt] = useState("");
  const [saving, setSaving] = useState(false);

  const toTarget = (k: string): FocusTargetInput | null => {
    if (k.startsWith("task:")) return { taskId: k.slice("task:".length) };
    const s = k.slice("subject:".length);
    return (FOCUS_FIXED_SUBJECTS as readonly string[]).includes(s)
      ? { subject: s as FocusFixedSubject }
      : null;
  };

  const submit = async () => {
    const target = toTarget(key);
    const min = Number(minutes);
    if (!target || !endAt || !Number.isFinite(min) || min <= 0) {
      onError("対象・分数・終了時刻を入れてください");
      return;
    }
    const endIso = fromJstInputValue(endAt);
    const startIso = new Date(Date.parse(endIso) - min * 60 * 1000).toISOString();
    setSaving(true);
    onError(null);
    try {
      await addManualFocusSession(target, startIso, endIso);
      setOpen(false);
      router.refresh();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setKey(defaultKey);
          setEndAt(toJstInputValue(new Date().toISOString()));
          setOpen(true);
        }}
      >
        ＋ 測り忘れた分を追加
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div>
        <label htmlFor="manual-target" className="mb-1 block text-xs text-muted-foreground">
          対象
        </label>
        <TargetSelect
          id="manual-target"
          value={key}
          onChange={setKey}
          planned={planned}
          others={others}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="w-24">
          <label htmlFor="manual-min" className="mb-1 block text-xs text-muted-foreground">
            分
          </label>
          <Input
            id="manual-min"
            type="number"
            min={1}
            max={1440}
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor="manual-end" className="mb-1 block text-xs text-muted-foreground">
            終えた時刻
          </label>
          <input
            id="manual-end"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={saving}>
          追加
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          キャンセル
        </Button>
      </div>
    </div>
  );
}
