import { getTodayString, isActiveCompany, LEVEL_ORDER } from "@/lib/utils";
import type { Company, DesiredLevel, Task } from "@/types";

/** 志望度が高いほど前に出す（同じ締切なら S > A > … の順） */
function levelWeight(level: DesiredLevel | null): number {
  if (!level) return 0.4;
  return (LEVEL_ORDER[level] ?? 5) * 0.12;
}

/** ES提出前の段階か（ESは書くのに時間がかかるので早めに知らせる） */
function needsEsWriting(status: Company["status"]): boolean {
  return status === "未エントリー" || status === "マイページ登録済み" || status === "ES";
}

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
 * 締切があるものだけを対象にし、同じ締切なら志望度が高い方を上に出す。
 * ESがまだの企業は書く時間が要るので、締切より早めに知らせる。
 */
export function buildRuleRecommendations(
  companies: Company[],
  tasks: Task[],
  today = getTodayString()
): RuleRecommendation[] {
  const recs: RuleRecommendation[] = [];
  const companyById = new Map(companies.map((c) => [c.id, c]));

  for (const t of tasks) {
    if (t.is_done || !t.deadline) continue;
    const d = daysUntil(t.deadline, today);
    const c = t.company_id ? companyById.get(t.company_id) : undefined;
    const w = levelWeight(c?.desired_level ?? null);
    if (d < 0) {
      recs.push({
        id: `task-over-${t.id}`,
        text: `「${t.title}」の締切が${-d}日過ぎています`,
        company: c?.name ?? null,
        urgency: -100 + d + w,
      });
    } else if (d <= 5) {
      recs.push({
        id: `task-soon-${t.id}`,
        text:
          d === 0
            ? `「${t.title}」の締切は今日`
            : `「${t.title}」の締切まであと${d}日`,
        company: c?.name ?? null,
        urgency: d + w,
      });
    }
  }

  for (const c of companies) {
    if (!c.deadline) continue;
    if (c.status === "面接") continue; // 選考が進んでいる企業のエントリー締切は対象外
    const d = daysUntil(c.deadline, today);
    if (d < 0) continue;
    // ES未提出の段階は書く時間が必要なので10日前から、それ以外は5日前から
    const window = needsEsWriting(c.status) ? 10 : 5;
    if (d > window) continue;

    const esHint =
      needsEsWriting(c.status) && d >= 3 ? "（ES作成の時間を確保）" : "";
    recs.push({
      id: `deadline-${c.id}`,
      text:
        d === 0
          ? `「${c.name}」のエントリー締切は今日`
          : `「${c.name}」のエントリー締切まであと${d}日${esHint}`,
      company: c.name,
      urgency: d - 0.5 + levelWeight(c.desired_level),
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
