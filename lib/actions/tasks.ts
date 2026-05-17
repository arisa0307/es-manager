"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TaskInsert, TaskUpdate } from "@/types";

export async function getTasks(options?: {
  search?: string;
  priority?: string;
  isDone?: boolean;
  companyId?: string;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("tasks")
    .select("*, companies(id, name)")
    .order("deadline", { ascending: true, nullsFirst: false });

  if (options?.search) {
    query = query.or(
      `title.ilike.%${options.search}%,memo.ilike.%${options.search}%`
    );
  }
  if (options?.priority) query = query.eq("priority", options.priority);
  if (options?.isDone !== undefined)
    query = query.eq("is_done", options.isDone);
  if (options?.companyId) query = query.eq("company_id", options.companyId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
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
    .select("id, title, deadline, company_id, is_done")
    .not("deadline", "is", null)
    .eq("is_done", false);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createTask(input: TaskInsert) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  if (input.company_id) revalidatePath(`/companies/${input.company_id}`);
  return data;
}

export async function updateTask(id: string, input: TaskUpdate) {
  const supabase = await createClient();
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
  if (data?.company_id) revalidatePath(`/companies/${data.company_id}`);
  return data;
}

export async function toggleTaskDone(id: string, isDone: boolean) {
  return updateTask(id, { is_done: isDone });
}

export async function deleteTask(id: string) {
  const supabase = await createClient();
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
  if (row?.company_id) revalidatePath(`/companies/${row.company_id}`);
}
