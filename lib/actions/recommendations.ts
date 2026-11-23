"use server";

import { unstable_noStore as noStore } from "next/cache";
import { getCompanies } from "@/lib/actions/companies";
import { getTasks } from "@/lib/actions/tasks";
import { isFeatureEnabled } from "@/lib/features-server";
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

  // 個人向け機能。オフの人からは呼べない（API の利用枠を守るため）
  if (!(await isFeatureEnabled("ai_next_actions"))) {
    return { ok: false, error: "この機能はオフになっています。設定でオンにできます。" };
  }

  if (!isGeminiConfigured()) {
    // どの環境でキーが見えていないのかを切り分けられるようにする（値は出さない）
    const where = process.env.VERCEL_ENV
      ? `Vercel:${process.env.VERCEL_ENV}`
      : "ローカル";
    return {
      ok: false,
      error: `GEMINI_API_KEY がこの環境（${where}）で読めていません。Vercelなら該当プロジェクトの Settings → Environment Variables に追加し、その環境にチェックを入れてから再デプロイしてください。`,
    };
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
