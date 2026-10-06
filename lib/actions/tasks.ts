"use server";

import { revalidatePath } from "next/cache";
import { getAuthedClient } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getFocusDayString, LEVEL_ORDER } from "@/lib/utils";
import { shouldShowTaskOnCalendar } from "@/lib/calendar-task-visibility";
import type {
  DesiredLevel,
  SortOrder,
  TaskInsert,
  TaskUpdate,
  TaskWithCompany,
} from "@/types";

type TaskSort = "deadline" | "desired_level";

export async function getTasks(options?: {
  search?: string;
  priority?: string;
  kind?: string;
  isDone?: boolean;
  companyId?: string;
  sort?: TaskSort;
  order?: SortOrder;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("tasks")
    .select("*, companies(id, name, desired_level)")
    .order("deadline", { ascending: true, nullsFirst: false });

  if (options?.search) {
    query = query.or(
      `title.ilike.%${options.search}%,memo.ilike.%${options.search}%`
    );
  }
  if (options?.priority) query = query.eq("priority", options.priority);
  if (options?.kind) query = query.eq("kind", options.kind);
  if (options?.isDone !== undefined)
    query = query.eq("is_done", options.isDone);
  if (options?.companyId) query = query.eq("company_id", options.companyId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return sortTasks(data ?? [], options?.sort ?? "deadline", options?.order ?? "asc");
}

/**
 * /focus 用: 今日(Asia/Tokyo)の並びに入っているタスクを plan_order 昇順で返す。
 * 完了済みも含める(誤操作に気づけるよう、当日は取り消し線で残して戻せるようにするため)。
 * 翌日は plan_date が一致しなくなるので自動的に消える。
 * 毎朝 Cowork 側が plan_date / plan_order を書き込む前提。
 */
export async function getFocusTasks(): Promise<TaskWithCompany[]> {
  const supabase = await createClient();
  const today = getFocusDayString();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, companies(id, name, desired_level)")
    .eq("plan_date", today)
    .order("plan_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as TaskWithCompany[];
}

function sortTasks<T extends {
  deadline: string | null;
  companies: { desired_level: DesiredLevel | null } | null;
}>(
  tasks: T[],
  sort: TaskSort,
  order: SortOrder
): T[] {
  const dir = order === "asc" ? 1 : -1;
  return [...tasks].sort((a, b) => {
    if (sort === "desired_level") {
      const aLevel = LEVEL_ORDER[a.companies?.desired_level ?? "C"] ?? 9;
      const bLevel = LEVEL_ORDER[b.companies?.desired_level ?? "C"] ?? 9;
      if (aLevel !== bLevel) return (aLevel - bLevel) * dir;
    }

    const aDeadline = a.deadline ?? "9999-12-31";
    const bDeadline = b.deadline ?? "9999-12-31";
    return aDeadline.localeCompare(bDeadline) * dir;
  });
}

export async function getTaskStats() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("is_done, deadline");
  if (error) throw new Error(error.message);

  const today = new Date().toISOString().split("T")[0];
  let pending = 0;
  let completed = 0;
  let overdue = 0;

  for (const t of data ?? []) {
    if (t.is_done) completed++;
    else {
      pending++;
      if (t.deadline && t.deadline < today) overdue++;
    }
  }
  return { pending, completed, overdue, total: data?.length ?? 0 };
}

export async function getCalendarTaskEvents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, title, deadline, company_id, is_done, est_pomos, show_on_calendar, companies(name)"
    )
    .not("deadline", "is", null)
    .eq("is_done", false);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as {
    id: string;
    title: string;
    deadline: string | null;
    company_id: string | null;
    is_done: boolean;
    est_pomos: number | null;
    show_on_calendar: boolean | null;
    companies: { name: string } | null;
  }[];
  // Googleカレンダー同期と同じ条件で、出さないタスクは除外する
  return rows.filter(shouldShowTaskOnCalendar);
}

export async function createTask(input: TaskInsert) {
  const { supabase, user } = await getAuthedClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath("/focus");
  if (input.company_id) revalidatePath(`/companies/${input.company_id}`);
  return data;
}

export async function updateTask(id: string, input: TaskUpdate) {
  const { supabase } = await getAuthedClient();
  const { data, error } = await supabase
    .from("tasks")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath("/focus");
  if (data?.company_id) revalidatePath(`/companies/${data.company_id}`);
  return data;
}

export async function toggleTaskDone(id: string, isDone: boolean) {
  return updateTask(id, { is_done: isDone });
}

/**
 * 既存メモを壊さず、新しい行を「[YYYY-MM-DD ラベル] 本文」の形で改行追記する。
 * 翌朝どの操作で書かれたメモか読み違えないよう、日付(JST)と操作ラベルを付ける。
 */
function appendMemoLine(
  existing: string | null,
  label: string,
  note: string
): string {
  const line = `[${getFocusDayString()} ${label}] ${note.trim()}`;
  if (!existing) return line;
  return `${existing}\n${line}`;
}

/**
 * /focus 用: タスクを完了する。任意の1行メモがあれば memo に追記する。
 * (選考結果は tasks.result で管理しているため、メモは result ではなく memo に入れる)
 */
export async function completeTaskWithNote(id: string, note?: string | null) {
  const { supabase } = await getAuthedClient();
  const patch: TaskUpdate = { is_done: true };
  if (note && note.trim()) {
    const { data: cur } = await supabase
      .from("tasks")
      .select("memo")
      .eq("id", id)
      .single();
    patch.memo = appendMemoLine(cur?.memo ?? null, "完了", note);
  }
  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath("/focus");
  if (data?.company_id) revalidatePath(`/companies/${data.company_id}`);
  return data;
}

/**
 * /focus 用: 途中まで進めたタスクを持ち越す。
 * est_pomos を1減らし(0未満にはしない)、plan_date を null に戻す。
 * 任意の1行メモがあれば memo に追記する。
 */
export async function carryOverTask(id: string, note?: string | null) {
  const { supabase } = await getAuthedClient();
  const { data: cur, error: readError } = await supabase
    .from("tasks")
    .select("memo, est_pomos")
    .eq("id", id)
    .single();
  if (readError) throw new Error(readError.message);

  const patch: TaskUpdate = {
    est_pomos: Math.max(0, (cur?.est_pomos ?? 1) - 1),
    plan_date: null,
  };
  if (note && note.trim()) {
    patch.memo = appendMemoLine(cur?.memo ?? null, "持ち越し", note);
  }
  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath("/focus");
  if (data?.company_id) revalidatePath(`/companies/${data.company_id}`);
  return data;
}

export async function deleteTask(id: string) {
  const { supabase } = await getAuthedClient();
  const { data: row } = await supabase
    .from("tasks")
    .select("company_id")
    .eq("id", id)
    .single();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath("/focus");
  if (row?.company_id) revalidatePath(`/companies/${row.company_id}`);
}
