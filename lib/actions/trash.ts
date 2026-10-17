"use server";

import { revalidatePath } from "next/cache";
import { getAuthedClient } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { TrashItem, TrashKind } from "@/lib/trash-types";

type Joined = { name: string } | { name: string }[] | null;
function companyName(c: Joined): string | null {
  if (!c) return null;
  return Array.isArray(c) ? (c[0]?.name ?? null) : c.name;
}

/** ゴミ箱(deleted_at 入り)の自分のデータを新しい順にまとめて返す。 */
export async function getTrashedItems(): Promise<TrashItem[]> {
  const supabase = await createClient();
  const [taskRes, eventRes, generalRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, deadline, deleted_at, companies(name)")
      .not("deleted_at", "is", null),
    supabase
      .from("company_events")
      .select("id, title, event_date, deleted_at, companies(name)")
      .not("deleted_at", "is", null),
    supabase
      .from("general_events")
      .select("id, title, event_date, deleted_at")
      .not("deleted_at", "is", null),
  ]);

  if (taskRes.error) throw new Error(taskRes.error.message);
  if (eventRes.error) throw new Error(eventRes.error.message);
  if (generalRes.error) throw new Error(generalRes.error.message);

  const items: TrashItem[] = [];
  for (const t of taskRes.data ?? []) {
    items.push({
      kind: "task",
      id: t.id,
      title: t.title,
      company: companyName(t.companies as Joined),
      date: t.deadline ?? null,
      deletedAt: t.deleted_at as string,
    });
  }
  for (const e of eventRes.data ?? []) {
    items.push({
      kind: "company_event",
      id: e.id,
      title: e.title,
      company: companyName(e.companies as Joined),
      date: e.event_date ?? null,
      deletedAt: e.deleted_at as string,
    });
  }
  for (const g of generalRes.data ?? []) {
    items.push({
      kind: "general_event",
      id: g.id,
      title: g.title,
      company: null,
      date: g.event_date ?? null,
      deletedAt: g.deleted_at as string,
    });
  }

  return items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

const TABLE: Record<TrashKind, "tasks" | "company_events" | "general_events"> = {
  task: "tasks",
  company_event: "company_events",
  general_event: "general_events",
};

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/focus");
  revalidatePath("/calendar");
  revalidatePath("/trash");
}

/**
 * ゴミ箱から戻す(deleted_at を null に)。
 * タスクの親を戻すときは、同じ deleted_at でゴミ箱に入った子タスクも一緒に戻す。
 * 予定のユニークインデックス違反(23505)は分かりやすい文言にする。
 */
export async function restoreTrashedItem(kind: TrashKind, id: string) {
  const { supabase } = await getAuthedClient();

  if (kind === "task") {
    const { data: row } = await supabase
      .from("tasks")
      .select("deleted_at")
      .eq("id", id)
      .single();
    const { error } = await supabase
      .from("tasks")
      .update({ deleted_at: null })
      .eq("id", id);
    if (error) throw new Error(error.message);
    // 同時にゴミ箱へ入れた子タスクも一緒に戻す。
    if (row?.deleted_at) {
      await supabase
        .from("tasks")
        .update({ deleted_at: null })
        .eq("parent_task_id", id)
        .eq("deleted_at", row.deleted_at);
    }
    revalidateAll();
    return;
  }

  const { error } = await supabase
    .from(TABLE[kind])
    .update({ deleted_at: null })
    .eq("id", id);
  if (error?.code === "23505") {
    throw new Error("同じ日時の予定が既にあります");
  }
  if (error) throw new Error(error.message);
  revalidateAll();
}

/** ゴミ箱から完全に削除(本当の delete)。親タスクは子タスクも cascade で消える。 */
export async function purgeTrashedItem(kind: TrashKind, id: string) {
  const { supabase } = await getAuthedClient();
  const { error } = await supabase.from(TABLE[kind]).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/trash");
}
