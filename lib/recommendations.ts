import { getTodayString, isActiveCompany } from "@/lib/utils";
import type { Company, Task } from "@/types";

export type RuleRecommendation = {
  id: string;
  text: string;
  company: string | null;
  /** 小さいほど緊急。並び替え用 */
  urgency: number;
};

function daysUntil(dateStr: string, today: string): number {
  const a = Date.UTC(
    ...(dateStr.split("-").map(Number) as [number, number, number])
  );
  const b = Date.UTC(...(today.split("-").map(Number) as [number, number, number]));
  return Math.round((a - b) / 86_400_000);
}

/**
 * データから機械的に「次にやること」を導く（LLM不要・即時・確実）。
 * 締切超過 → 締切間近タスク → エントリー締切間近 → 進行中で次アクション未設定 の順。
 */
export function buildRuleRecommendations(
  companies: Company[],
  tasks: Task[],
  today = getTodayString()
): RuleRecommendation[] {
  const recs: RuleRecommendation[] = [];
  const companyName = new Map(companies.map((c) => [c.id, c.name]));

  for (const t of tasks) {
    if (t.is_done || !t.deadline) continue;
    const d = daysUntil(t.deadline, today);
    const name = t.company_id ? companyName.get(t.company_id) ?? null : null;
    if (d < 0) {
      recs.push({
        id: `task-over-${t.id}`,
        text: `「${t.title}」の締切が${-d}日過ぎています`,
        company: name,
        urgency: -100 + d,
      });
    } else if (d <= 3) {
      recs.push({
        id: `task-soon-${t.id}`,
        text: `「${t.title}」の締切まであと${d}日`,
        company: name,
        urgency: d,
      });
    }
  }

  for (const c of companies) {
    if (!c.deadline) continue;
    const d = daysUntil(c.deadline, today);
    if (d < 0 || d > 7) continue;
    if (c.status === "面接") continue; // 選考が進んでいる企業のエントリー締切は対象外
    recs.push({
      id: `deadline-${c.id}`,
      text:
        d === 0
          ? `「${c.name}」のエントリー締切は今日`
          : `「${c.name}」のエントリー締切まであと${d}日`,
      company: c.name,
      urgency: d - 0.5,
    });
  }

  const hasOpenTask = new Set(
    tasks.filter((t) => !t.is_done && t.company_id).map((t) => t.company_id!)
  );
  for (const c of companies) {
    if (!isActiveCompany(c)) continue;
    if (c.next_action?.trim() || c.progress_note?.trim()) continue;
    if (hasOpenTask.has(c.id)) continue;
    recs.push({
      id: `no-next-${c.id}`,
      text: `「${c.name}」の次のアクションが未設定（${c.status}）`,
      company: c.name,
      urgency: 20,
    });
  }

  return recs.sort((a, b) => a.urgency - b.urgency).slice(0, 8);
}

/**
 * Gemini に渡す就活状況のサマリー。ログイン情報などの機微データは含めない。
 */
export function buildSituationSummary(
  companies: Company[],
  tasks: Task[],
  today = getTodayString()
): string {
  const lines: string[] = [`今日の日付: ${today}`, ""];

  const active = companies.filter(isActiveCompany);
  lines.push(`【選考中の企業 ${active.length}社】`);
  for (const c of active) {
    const parts = [
      `- ${c.name}`,
      `状態:${c.status}`,
      c.result ? `結果:${c.result}` : "",
      c.desired_level ? `志望度:${c.desired_level}` : "",
      c.deadline ? `締切:${c.deadline}` : "",
      c.progress_note ? `進捗:${c.progress_note}` : "",
      c.next_action ? `次:${c.next_action}` : "次アクション未設定",
    ].filter(Boolean);
    lines.push(parts.join(" / "));
  }

  const openTasks = tasks.filter((t) => !t.is_done);
  lines.push("", `【未完了タスク ${openTasks.length}件】`);
  for (const t of openTasks) {
    const name = t.company_id
      ? companies.find((c) => c.id === t.company_id)?.name
      : null;
    const parts = [
      `- ${t.title}`,
      name ? `企業:${name}` : "",
      t.deadline ? `締切:${t.deadline}` : "締切なし",
      t.result ? `結果:${t.result}` : "",
    ].filter(Boolean);
    lines.push(parts.join(" / "));
  }

  return lines.join("\n");
}
