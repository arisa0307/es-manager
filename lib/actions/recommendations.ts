"use server";

import { unstable_noStore as noStore } from "next/cache";
import { getCompanies } from "@/lib/actions/companies";
import { getTasks } from "@/lib/actions/tasks";
import { buildSituationSummary } from "@/lib/recommendations";
import {
  generateNextActions,
  isGeminiConfigured,
  type AiNextAction,
} from "@/lib/ai/gemini";

export type AiNextActionsResult =
  | { ok: true; actions: AiNextAction[] }
  | { ok: false; error: string };

/**
 * Geminiに就活状況を渡し「次にやること」を生成する。
 * ダッシュボードのボタン押下時にのみ呼ぶ（毎回のページ表示では呼ばない）。
 */
export async function getAiNextActions(): Promise<AiNextActionsResult> {
  noStore();

  if (!isGeminiConfigured()) {
    return { ok: false, error: "AI要約は未設定です（GEMINI_API_KEY）。" };
  }

  try {
    const [companies, tasks] = await Promise.all([
      getCompanies(),
      getTasks({ isDone: false }),
    ]);
    const summary = buildSituationSummary(companies, tasks);
    const actions = await generateNextActions(summary);
    return { ok: true, actions };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "AI生成に失敗しました",
    };
  }
}
