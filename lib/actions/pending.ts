"use server";

import { createClient } from "@/lib/supabase/server";
import {
  COMPANY_EVENT_TYPE_LABELS,
  type CompanyEventType,
} from "@/types";

export type PendingResult = {
  id: string;
  label: string;
  title: string;
  company: string | null;
  companyId: string | null;
  date: string | null;
  href: string;
};

type Joined = { name: string } | { name: string }[] | null;
function companyName(c: Joined): string | null {
  if (!c) return null;
  return Array.isArray(c) ? (c[0]?.name ?? null) : c.name;
}

/**
 * 「結果待ち」の選考を ES・予定・タスクから横断で集める。
 * 結果が出たのに記載し忘れるのを防ぐためのフォローアップ一覧。
 */
export async function getPendingResults(): Promise<PendingResult[]> {
  const supabase = await createClient();
  const [esRes, eventRes, taskRes] = await Promise.all([
    supabase
      .from("es_submissions")
      .select("id, title, phase, company_id, submitted_on, result, companies(name)")
      .eq("result", "結果待ち")
      .eq("kind", "ES"),
    supabase
      .from("company_events")
      .select("id, type, title, event_date, company_id, result, companies(name)")
      .eq("result", "結果待ち")
      .is("deleted_at", null),
    supabase
      .from("tasks")
      .select("id, title, deadline, company_id, result, companies(name)")
      .eq("result", "結果待ち")
      .is("deleted_at", null),
  ]);

  const items: PendingResult[] = [];

  for (const e of esRes.data ?? []) {
    items.push({
      id: `es-${e.id}`,
      label: `ES(${e.phase})`,
      title: e.title || "ES提出",
      company: companyName(e.companies as Joined),
      companyId: e.company_id,
      date: e.submitted_on ?? null,
      href: e.company_id ? `/companies/${e.company_id}#company-es` : "/es",
    });
  }
  for (const ev of eventRes.data ?? []) {
    items.push({
      id: `event-${ev.id}`,
      label: COMPANY_EVENT_TYPE_LABELS[ev.type as CompanyEventType] ?? "予定",
      title: ev.title,
      company: companyName(ev.companies as Joined),
      companyId: ev.company_id,
      date: ev.event_date ?? null,
      href: ev.company_id
        ? `/companies/${ev.company_id}#company-events`
        : "/calendar",
    });
  }
  for (const t of taskRes.data ?? []) {
    items.push({
      id: `task-${t.id}`,
      label: "タスク",
      title: t.title,
      company: companyName(t.companies as Joined),
      companyId: t.company_id,
      date: t.deadline ?? null,
      href: t.company_id ? `/companies/${t.company_id}#company-tasks` : "/tasks",
    });
  }

  // 日付があるものは古い順（待って長いほど結果が出ている可能性が高い）、日付なしは末尾。
  return items.sort((a, b) => {
    if (a.date && b.date) return a.date.localeCompare(b.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });
}
