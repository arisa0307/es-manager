"use server";

import { revalidatePath } from "next/cache";
import { getAuthedClient } from "@/lib/supabase/auth";
import { classifySession } from "@/lib/focus-categories";
import {
  addDaysToDateString,
  getFocusDayOf,
  getFocusDayString,
} from "@/lib/utils";
import {
  FOCUS_FIXED_SUBJECTS,
  type FocusSessionEntry,
  type FocusTargetInput,
  type TaskCategory,
} from "@/types";

/*
 * /focus の時間計測(ストップウォッチ)。記録先は pomodoro_sessions(kind='focus')。
 * - 開始: started_at を入れて行を作る(ended_at=null が「計測中」)
 * - 終了: ended_at と completed=true を入れる
 * - 手入力: started_at / ended_at / completed=true を入れた行を作る
 * 固定の対象は task_id=null・note=ラベル名。
 * RLS に加えて、すべてのクエリを user_id で本人分に絞る。
 */

const MAX_SESSION_MS = 24 * 60 * 60 * 1000;
/** 端末の時計ずれを許す幅 */
const CLOCK_SKEW_MS = 2 * 60 * 1000;

type SessionRow = {
  id: string;
  task_id: string | null;
  note: string | null;
  started_at: string;
  ended_at: string | null;
};

function revalidateFocus() {
  revalidatePath("/focus");
}

/** 対象を検証し、insert 用の task_id / note を返す。タスクは本人のものだけ許可。 */
async function resolveTarget(
  supabase: Awaited<ReturnType<typeof getAuthedClient>>["supabase"],
  userId: string,
  target: FocusTargetInput
): Promise<{ task_id: string | null; note: string | null }> {
  if (target.subject !== undefined) {
    if (!(FOCUS_FIXED_SUBJECTS as readonly string[]).includes(target.subject)) {
      throw new Error("不正な計測対象です");
    }
    return { task_id: null, note: target.subject };
  }
  const { data, error } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", target.taskId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("タスクが見つかりません");
  return { task_id: target.taskId, note: null };
}

function validateRange(startedAt: string, endedAt: string) {
  const s = Date.parse(startedAt);
  const e = Date.parse(endedAt);
  if (Number.isNaN(s) || Number.isNaN(e)) throw new Error("日時が不正です");
  if (e <= s) throw new Error("終了時刻は開始時刻より後にしてください");
  if (e - s > MAX_SESSION_MS) throw new Error("1回の記録は24時間までです");
  if (e > Date.now() + CLOCK_SKEW_MS) {
    throw new Error("未来の時刻は記録できません");
  }
}

/** 計測開始。すでに計測中の行があれば新しく作らずエラーにする(別端末での二重開始を防ぐ)。 */
export async function startFocusSession(target: FocusTargetInput) {
  const { supabase, user } = await getAuthedClient();
  const { data: running, error: runningError } = await supabase
    .from("pomodoro_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("kind", "focus")
    .is("ended_at", null)
    .limit(1);
  if (runningError) throw new Error(runningError.message);
  if (running && running.length > 0) {
    revalidateFocus();
    throw new Error("すでに計測中です。画面を更新してください");
  }

  const { task_id, note } = await resolveTarget(supabase, user.id, target);
  const { error } = await supabase.from("pomodoro_sessions").insert({
    user_id: user.id,
    task_id,
    note,
    kind: "focus",
    started_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidateFocus();
}

/**
 * 計測終了。endedAt を渡すとその時刻で終了する(止め忘れたとき用)。
 * 別端末ですでに終了済みなら何もしない。
 */
export async function stopFocusSession(id: string, endedAt?: string) {
  const { supabase, user } = await getAuthedClient();
  const { data: row, error: readError } = await supabase
    .from("pomodoro_sessions")
    .select("started_at, ended_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!row || row.ended_at) {
    revalidateFocus();
    return;
  }
  const end = endedAt ?? new Date().toISOString();
  if (endedAt) validateRange(row.started_at, end);
  const { error } = await supabase
    .from("pomodoro_sessions")
    .update({ ended_at: end, completed: true })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("ended_at", null);
  if (error) throw new Error(error.message);
  revalidateFocus();
}

/** 終了済みの記録の開始・終了時刻を直す。 */
export async function updateFocusSessionTimes(
  id: string,
  startedAt: string,
  endedAt: string
) {
  validateRange(startedAt, endedAt);
  const { supabase, user } = await getAuthedClient();
  const { error } = await supabase
    .from("pomodoro_sessions")
    .update({ started_at: startedAt, ended_at: endedAt, completed: true })
    .eq("id", id)
    .eq("user_id", user.id)
    .not("ended_at", "is", null);
  if (error) throw new Error(error.message);
  revalidateFocus();
}

/** 測り忘れた分を手入力で追加する。 */
export async function addManualFocusSession(
  target: FocusTargetInput,
  startedAt: string,
  endedAt: string
) {
  validateRange(startedAt, endedAt);
  const { supabase, user } = await getAuthedClient();
  const { task_id, note } = await resolveTarget(supabase, user.id, target);
  const { error } = await supabase.from("pomodoro_sessions").insert({
    user_id: user.id,
    task_id,
    note,
    kind: "focus",
    started_at: startedAt,
    ended_at: endedAt,
    completed: true,
  });
  if (error) throw new Error(error.message);
  revalidateFocus();
}

/** 記録を削除する(誤って作った記録用)。 */
export async function deleteFocusSession(id: string) {
  const { supabase, user } = await getAuthedClient();
  const { error } = await supabase
    .from("pomodoro_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidateFocus();
}

/**
 * /focus 用のデータをまとめて取る。
 * - sessions: 直近 days 日(7:00 JST区切り)に始まった終了済みの記録(新しい順)
 * - active: 計測中の記録(なければ null)
 * - taskTotals: タスクごとの累計秒数(全期間・終了済みのみ)
 * 過去の25分単位の記録も ended_at − started_at でそのまま集計に入る。
 * 休憩(short_break / long_break)は含めない。
 */
export async function getFocusData(days = 7): Promise<{
  sessions: FocusSessionEntry[];
  active: FocusSessionEntry | null;
  taskTotals: Record<string, number>;
}> {
  const { supabase, user } = await getAuthedClient();
  const startIso = `${addDaysToDateString(getFocusDayString(), -(days - 1))}T07:00:00+09:00`;

  const [recentRes, activeRes, totalsRes] = await Promise.all([
    supabase
      .from("pomodoro_sessions")
      .select("id, task_id, note, started_at, ended_at")
      .eq("user_id", user.id)
      .eq("kind", "focus")
      .not("ended_at", "is", null)
      .gte("started_at", startIso)
      .order("started_at", { ascending: false }),
    supabase
      .from("pomodoro_sessions")
      .select("id, task_id, note, started_at, ended_at")
      .eq("user_id", user.id)
      .eq("kind", "focus")
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1),
    supabase
      .from("pomodoro_sessions")
      .select("task_id, started_at, ended_at")
      .eq("user_id", user.id)
      .eq("kind", "focus")
      .not("ended_at", "is", null)
      .not("task_id", "is", null),
  ]);
  if (recentRes.error) throw new Error(recentRes.error.message);
  if (activeRes.error) throw new Error(activeRes.error.message);
  if (totalsRes.error) throw new Error(totalsRes.error.message);

  const recent = (recentRes.data ?? []) as SessionRow[];
  const activeRow = ((activeRes.data ?? []) as SessionRow[])[0] ?? null;

  // カテゴリ判定とラベルのためにタスク情報をまとめて引く(ゴミ箱のタスクも名前は出す)。
  const ids = [
    ...new Set(
      [...recent, ...(activeRow ? [activeRow] : [])]
        .map((r) => r.task_id)
        .filter((v): v is string => !!v)
    ),
  ];
  const tasks = new Map<
    string,
    { title: string; category: TaskCategory | null; company: string | null }
  >();
  if (ids.length > 0) {
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, category, companies(name)")
      .eq("user_id", user.id)
      .in("id", ids);
    if (error) throw new Error(error.message);
    for (const t of (data ?? []) as unknown as {
      id: string;
      title: string;
      category: TaskCategory | null;
      companies: { name: string } | null;
    }[]) {
      tasks.set(t.id, {
        title: t.title,
        category: t.category,
        company: t.companies?.name ?? null,
      });
    }
  }

  const toEntry = (r: SessionRow): FocusSessionEntry => {
    const task = r.task_id ? (tasks.get(r.task_id) ?? null) : null;
    return {
      id: r.id,
      task_id: r.task_id,
      note: r.note,
      started_at: r.started_at,
      ended_at: r.ended_at,
      label:
        task?.title ?? r.note ?? (r.task_id ? "削除されたタスク" : "対象なし"),
      company: task?.company ?? null,
      category: classifySession(task, r.note),
      day: getFocusDayOf(r.started_at),
    };
  };

  const taskTotals: Record<string, number> = {};
  for (const r of (totalsRes.data ?? []) as {
    task_id: string | null;
    started_at: string;
    ended_at: string | null;
  }[]) {
    if (!r.task_id || !r.ended_at) continue;
    const sec = Math.max(
      0,
      (Date.parse(r.ended_at) - Date.parse(r.started_at)) / 1000
    );
    taskTotals[r.task_id] = (taskTotals[r.task_id] ?? 0) + sec;
  }

  return {
    sessions: recent.map(toEntry),
    active: activeRow ? toEntry(activeRow) : null,
    taskTotals,
  };
}
