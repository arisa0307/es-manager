/**
 * タスク・ES・予定を「その1件」で開くためのリンク。
 *
 * 企業ページ:  /companies/<id>?open=tasks|es&item=task-<id>|es-<id>|event-<id>
 *   - open: 最初から開いておく欄（カンマ区切りで複数可）
 *   - item: 開いたあとにスクロールして目立たせる項目（DOM の id と同じ）
 * タスク一覧:  /tasks?item=task-<id>
 * ES 一覧:     /es?item=es-<提出id>
 */

export type CompanySection = "tasks" | "es";

export const itemDomId = {
  task: (id: string) => `task-${id}`,
  es: (submissionId: string) => `es-${submissionId}`,
  event: (id: string) => `event-${id}`,
};

export function companyHref(
  companyId: string,
  opts: { open?: CompanySection[]; item?: string } = {}
): string {
  const params = new URLSearchParams();
  if (opts.open?.length) params.set("open", opts.open.join(","));
  if (opts.item) params.set("item", opts.item);
  const qs = params.toString();
  return `/companies/${companyId}${qs ? `?${qs}` : ""}`;
}

export function taskHref(task: { id: string; company_id: string | null }): string {
  return task.company_id
    ? companyHref(task.company_id, { open: ["tasks"], item: itemDomId.task(task.id) })
    : `/tasks?item=${itemDomId.task(task.id)}`;
}

export function esHref(submission: { id: string; company_id: string | null }): string {
  return submission.company_id
    ? companyHref(submission.company_id, { open: ["es"], item: itemDomId.es(submission.id) })
    : `/es?item=${itemDomId.es(submission.id)}`;
}

export function eventHref(event: { id: string; company_id: string | null }): string {
  return event.company_id
    ? companyHref(event.company_id, { item: itemDomId.event(event.id) })
    : "/calendar";
}

/** URL の open=... を読み取る */
export function parseOpenSections(value: string | null | undefined): Set<CompanySection> {
  const set = new Set<CompanySection>();
  for (const v of (value ?? "").split(",")) {
    if (v === "tasks" || v === "es") set.add(v);
  }
  return set;
}
