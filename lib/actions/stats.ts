"use server";

import { createClient } from "@/lib/supabase/server";
import { getTodayString } from "@/lib/utils";

export type StageStat = {
  stage: string;
  passed: number;
  failed: number;
  waiting: number;
};

export type SelectionStats = {
  stages: StageStat[];
  /** 面接のラウンド別(一次/二次/最終/AIなど)内訳 */
  interviewRounds: StageStat[];
  /** 参加済み(開催日が今日以前)のインターン数 */
  internshipAttended: number;
  /** 参加予定(開催日が今日より後)のインターン数 */
  internshipUpcoming: number;
};

const STAGES = ["ES", "適性試験", "GD", "面接"] as const;

const EVENT_TYPE_TO_STAGE: Record<string, (typeof STAGES)[number] | undefined> = {
  web_test: "適性試験",
  gd: "GD",
  interview: "面接",
};

/** 面接タイトルからラウンドを推定(面接内の細分化に限定) */
const INTERVIEW_ROUNDS = [
  "一次面接",
  "二次面接",
  "三次面接",
  "最終面接",
  "AI面接",
  "その他面接",
] as const;

function classifyInterviewRound(title: string): (typeof INTERVIEW_ROUNDS)[number] {
  const t = title ?? "";
  if (/ai|ＡＩ/i.test(t)) return "AI面接";
  if (/最終|ファイナル|final/i.test(t)) return "最終面接";
  if (/三次|3次|３次/.test(t)) return "三次面接";
  if (/二次|2次|２次/.test(t)) return "二次面接";
  if (/一次|1次|１次|初回/.test(t)) return "一次面接";
  return "その他面接";
}

/**
 * 選考ステップごとの通過状況を集計する。集計元は、種別が明示されたもののみ:
 * ES=ES提出 / 適性試験・GD・面接=予定(イベントの種類)＋タスク(選考種別を設定したもの)。
 * タイトル推測は使わないので重複・誤検知が起きない。
 */
export async function getSelectionFunnelStats(): Promise<SelectionStats> {
  const supabase = await createClient();
  const [esRes, eventRes, taskRes] = await Promise.all([
    supabase.from("es_submissions").select("result"),
    supabase.from("company_events").select("type, result, event_date, title"),
    supabase.from("tasks").select("stage, result, title"),
  ]);

  const stat: Record<string, StageStat> = Object.fromEntries(
    STAGES.map((s) => [s, { stage: s, passed: 0, failed: 0, waiting: 0 }])
  );
  const rounds: Record<string, StageStat> = Object.fromEntries(
    INTERVIEW_ROUNDS.map((s) => [s, { stage: s, passed: 0, failed: 0, waiting: 0 }])
  );

  const bump = (target: StageStat | undefined, result: string | null) => {
    if (!target || !result) return;
    if (result === "通過") target.passed++;
    else if (result === "不通過") target.failed++;
    else if (result === "結果待ち") target.waiting++;
  };

  const today = getTodayString();
  let internshipAttended = 0;
  let internshipUpcoming = 0;

  for (const r of esRes.data ?? []) bump(stat["ES"], r.result);
  for (const e of eventRes.data ?? []) {
    bump(stat[EVENT_TYPE_TO_STAGE[e.type] ?? ""], e.result);
    if (e.type === "interview") bump(rounds[classifyInterviewRound(e.title)], e.result);
    if (e.type === "internship" && e.event_date) {
      if (e.event_date <= today) internshipAttended++;
      else internshipUpcoming++;
    }
  }
  // 選考種別を設定したタスク(SPI等の適性試験・GD・面接)も反映する
  for (const t of taskRes.data ?? []) {
    bump(stat[t.stage ?? ""], t.result);
    if (t.stage === "面接") bump(rounds[classifyInterviewRound(t.title ?? "")], t.result);
  }

  return {
    stages: STAGES.map((s) => stat[s]),
    interviewRounds: INTERVIEW_ROUNDS.map((s) => rounds[s]).filter(
      (r) => r.passed + r.failed + r.waiting > 0
    ),
    internshipAttended,
    internshipUpcoming,
  };
}
