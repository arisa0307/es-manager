"use server";

import { revalidatePath } from "next/cache";
import { getAuthedClient } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  addDaysToDateString,
  getFocusDayOf,
  getFocusDayStartIso,
  getFocusDayString,
} from "@/lib/utils";
import {
  FOCUS_FIXED_SUBJECTS,
  type PomodoroKind,
  type PomodoroLogEntry,
} from "@/types";

/**
 * ポモドーロ開始。started_at を DB に記録し、id と開始時刻を返す。
 * subject は固定の対象(基本情報技術者など)を選んだときのラベルで、note に記録する。
 */
export async function startPomodoro(
  taskId: string | null,
  kind: PomodoroKind = "focus",
  subject: string | null = null
) {
  if (
    subject !== null &&
    !(FOCUS_FIXED_SUBJECTS as readonly string[]).includes(subject)
  ) {
    throw new Error("不正なポモの対象です");
  }
  const { supabase, user } = await getAuthedClient();
  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .insert({
      user_id: user.id,
      task_id: subject ? null : taskId,
      kind,
      note: subject,
      started_at: new Date().toISOString(),
    })
    .select("id, started_at")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string; started_at: string };
}

/**
 * ポモドーロ終了。最後まで回ったら completed=true、途中で止めたら false。
 * どちらでも ended_at を記録する。
 */
export async function finishPomodoro(id: string, completed: boolean) {
  const { supabase } = await getAuthedClient();
  const { error } = await supabase
    .from("pomodoro_sessions")
    .update({ ended_at: new Date().toISOString(), completed })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/focus");
}

/** 今日(7:00 JST区切り)完了した集中ポモの数。 */
export async function getTodayPomodoroCount(): Promise<number> {
  const supabase = await createClient();
  const startIso = getFocusDayStartIso();
  const { count, error } = await supabase
    .from("pomodoro_sessions")
    .select("id", { count: "exact", head: true })
    .eq("kind", "focus")
    .eq("completed", true)
    .gte("started_at", startIso);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * /focus のポモ記録: 直近 days 日分(今日を含む, 7:00 JST区切り)の終了済み集中セッション。
 * 新しい順。中断したもの(completed=false)も含める。
 */
export async function getPomodoroLog(days = 7): Promise<PomodoroLogEntry[]> {
  const supabase = await createClient();
  const startIso = `${addDaysToDateString(getFocusDayString(), -(days - 1))}T07:00:00+09:00`;
  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .select("id, task_id, started_at, ended_at, completed, note")
    .eq("kind", "focus")
    .not("ended_at", "is", null)
    .gte("started_at", startIso)
    .order("started_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as {
    id: string;
    task_id: string | null;
    started_at: string;
    ended_at: string | null;
    completed: boolean | null;
    note: string | null;
  }[];

  // タスク名はまとめて引く(ゴミ箱に入ったタスクも記録としては名前を出す)。
  const taskIds = [...new Set(rows.map((r) => r.task_id).filter(Boolean))] as string[];
  const tasks = new Map<string, { title: string; company: string | null }>();
  if (taskIds.length > 0) {
    const { data: taskRows, error: taskError } = await supabase
      .from("tasks")
      .select("id, title, companies(name)")
      .in("id", taskIds);
    if (taskError) throw new Error(taskError.message);
    for (const t of (taskRows ?? []) as unknown as {
      id: string;
      title: string;
      companies: { name: string } | null;
    }[]) {
      tasks.set(t.id, { title: t.title, company: t.companies?.name ?? null });
    }
  }

  return rows.map((r) => {
    const task = r.task_id ? tasks.get(r.task_id) : undefined;
    return {
      id: r.id,
      started_at: r.started_at,
      ended_at: r.ended_at,
      completed: r.completed === true,
      label: task?.title ?? r.note ?? (r.task_id ? "削除されたタスク" : "対象なし"),
      company: task?.company ?? null,
      day: getFocusDayOf(r.started_at),
    };
  });
}
