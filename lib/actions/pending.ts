"use server";

import { createClient } from "@/lib/supabase/server";
import { isActiveCompany } from "@/lib/utils";
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
  /** waiting: 明示的に結果待ち / unrecorded: 進捗未記入で確認が必要 */
  kind: "waiting" | "unrecorded";
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
  const [esRes, eventRes, taskRes, companyRes] = await Promise.all([
    supabase
      .from("es_submissions")
      .select("id, title, phase, company_id, submitted_on, result, companies(name)")
      .eq("result", "結果待ち"),
    supabase
      .from("company_events")
      .select("id, type, title, event_date, company_id, result, companies(name)")
      .eq("result", "結果待ち"),
    supabase
      .from("tasks")
      .select("id, title, deadline, company_id, result, companies(name)")
      .eq("result", "結果待ち"),
    supabase
      .from("companies")
      .select("id, name, status, result, progress_note, next_action"),
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
      kind: "waiting",
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
      kind: "waiting",
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
      kind: "waiting",
    });
  }

  // 進捗未記入の確認候補: 選考中で、進捗も次アクションも未記入、かつ
  // 既に上の明示的な結果待ちに載っていない企業。
  const coveredCompanyIds = new Set(
    items.map((i) => i.companyId).filter(Boolean)
  );
  for (const c of companyRes.data ?? []) {
    if (!isActiveCompany(c)) continue;
    if (c.progress_note?.trim() || c.next_action?.trim()) continue;
    if (coveredCompanyIds.has(c.id)) continue;
    items.push({
      id: `company-${c.id}`,
      label: "状況未記入",
      title: `${c.status}（進捗の記録なし）`,
      company: c.name,
      companyId: c.id,
      date: null,
      href: `/companies/${c.id}`,
      kind: "unrecorded",
    });
  }

  // 明示的な結果待ちを先に、未記入は後ろに。各群は日付の古い順（日付なしは末尾）。
  const order = { waiting: 0, unrecorded: 1 };
  return items.sort((a, b) => {
    if (a.kind !== b.kind) return order[a.kind] - order[b.kind];
    if (a.date && b.date) return a.date.localeCompare(b.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });
}
