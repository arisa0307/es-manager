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
  web_test: "適性試験",
  gd: "GD",
  interview: "面接",
};

/**
 * 選考ステップごとの通過状況を集計する。集計元は、種別が明示されたもののみ:
 * ES=ES提出 / 適性試験・GD・面接=予定(イベントの種類)＋タスク(選考種別を設定したもの)。
 * タイトル推測は使わないので重複・誤検知が起きない。
 */
export async function getSelectionFunnelStats(): Promise<SelectionStats> {
  const supabase = await createClient();
  const [esRes, eventRes, taskRes] = await Promise.all([
    supabase.from("es_submissions").select("result"),
    supabase.from("company_events").select("type, result, event_date"),
    supabase.from("tasks").select("stage, result"),
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
  // 選考種別を設定したタスク(SPI等の適性試験・GD・面接)も反映する
  for (const t of taskRes.data ?? []) add(t.stage, t.result);

  return {
    stages: STAGES.map((s) => stat[s]),
    internshipAttended,
    internshipUpcoming,
  };
}
