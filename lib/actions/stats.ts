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
  /** 参加済み(開催日が今日以前)のインターン数 */
  internshipAttended: number;
  /** 参加予定(開催日が今日より後)のインターン数 */
  internshipUpcoming: number;
};

const STAGES = ["ES", "適性試験", "GD", "面接"] as const;

const EVENT_TYPE_TO_STAGE: Record<string, (typeof STAGES)[number] | undefined> = {
  es: "ES",
  web_test: "適性試験",
  gd: "GD",
  interview: "面接",
};

/**
 * タスクは種別を持たないため、タイトルから選考ステージを推定する。
 * 日付が決まらずタスク管理される ES/適性/GD/面接 の結果も通過率に反映するための補助。
 */
function classifyTaskStage(title: string): (typeof STAGES)[number] | null {
  const t = title.toLowerCase();
  if (/gd|グルディス|グループディスカッション/.test(t) || title.includes("グループ"))
    return "GD";
  if (/spi|玉手箱|tg-?web|適性|テストセンター|webテスト|筆記/i.test(title))
    return "適性試験";
  if (title.includes("面接") || title.includes("面談")) return "面接";
  if (/\bes\b|ｅｓ/i.test(title) || title.includes("エントリーシート"))
    return "ES";
  return null;
}

/**
 * 選考ステップごとの通過状況を、ES・予定(イベント)・タスクの結果から横断集計する。
 * どのステップがボトルネックかを見るための材料。
 */
export async function getSelectionFunnelStats(): Promise<SelectionStats> {
  const supabase = await createClient();
  const [esRes, eventRes, taskRes] = await Promise.all([
    supabase.from("es").select("result"),
    supabase.from("company_events").select("type, result, event_date"),
    supabase.from("tasks").select("title, result"),
  ]);

  const stat: Record<string, StageStat> = Object.fromEntries(
    STAGES.map((s) => [s, { stage: s, passed: 0, failed: 0, waiting: 0 }])
  );

  const add = (stage: string | null | undefined, result: string | null) => {
    if (!stage || !result || !stat[stage]) return;
    if (result === "通過") stat[stage].passed++;
    else if (result === "不通過") stat[stage].failed++;
    else if (result === "結果待ち") stat[stage].waiting++;
  };

  const today = getTodayString();
  let internshipAttended = 0;
  let internshipUpcoming = 0;

  for (const r of esRes.data ?? []) add("ES", r.result);
  for (const e of eventRes.data ?? []) {
    add(EVENT_TYPE_TO_STAGE[e.type], e.result);
    if (e.type === "internship" && e.event_date) {
      if (e.event_date <= today) internshipAttended++;
      else internshipUpcoming++;
    }
  }
  for (const t of taskRes.data ?? []) add(classifyTaskStage(t.title ?? ""), t.result);

  return {
    stages: STAGES.map((s) => stat[s]),
    internshipAttended,
    internshipUpcoming,
  };
}
