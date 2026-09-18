"use server";

import { createClient } from "@/lib/supabase/server";
import { getTodayString } from "@/lib/utils";

export type StageDetail = {
  company: string;
  result: string;
};

export type StageStat = {
  stage: string;
  passed: number;
  failed: number;
  waiting: number;
  /** 各結果に該当する企業名(クリックで内訳表示するため) */
  entries: StageDetail[];
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

type Joined = { name: string } | { name: string }[] | null;
function companyName(c: Joined): string {
  if (!c) return "（企業なし）";
  const n = Array.isArray(c) ? c[0]?.name : c.name;
  return n ?? "（企業なし）";
}

/**
 * 選考ステップごとの通過状況を集計する。集計元は、種別が明示されたもののみ:
 * ES=ES提出 / 適性試験・GD・面接=予定(イベントの種類)＋タスク(選考種別を設定したもの)。
 * タイトル推測は使わないので重複・誤検知が起きない。
 */
export async function getSelectionFunnelStats(): Promise<SelectionStats> {
  const supabase = await createClient();
  const [esRes, eventRes, taskRes] = await Promise.all([
    supabase.from("es_submissions").select("result, kind, companies(name)"),
    supabase
      .from("company_events")
      .select("type, result, event_date, title, interview_round, companies(name)"),
    supabase.from("tasks").select("stage, result, title, companies(name)"),
  ]);

  const blank = (stage: string): StageStat => ({
    stage,
    passed: 0,
    failed: 0,
    waiting: 0,
    entries: [],
  });
  const stat: Record<string, StageStat> = Object.fromEntries(
    STAGES.map((s) => [s, blank(s)])
  );
  const rounds: Record<string, StageStat> = Object.fromEntries(
    INTERVIEW_ROUNDS.map((s) => [s, blank(s)])
  );

  const record = (
    target: StageStat | undefined,
    result: string | null,
    company: string
  ) => {
    if (!target || !result) return;
    if (result === "通過") target.passed++;
    else if (result === "不通過") target.failed++;
    else if (result === "結果待ち") target.waiting++;
    else return;
    target.entries.push({ company, result });
  };

  const today = getTodayString();
  let internshipAttended = 0;
  let internshipUpcoming = 0;

  for (const r of esRes.data ?? []) {
    // アンケートは通過/不通過の概念がないので通過率には含めない
    if (r.kind === "アンケート") continue;
    record(stat["ES"], r.result, companyName(r.companies as Joined));
  }
  for (const e of eventRes.data ?? []) {
    const name = companyName(e.companies as Joined);
    record(stat[EVENT_TYPE_TO_STAGE[e.type] ?? ""], e.result, name);
    if (e.type === "interview") {
      const round = e.interview_round || classifyInterviewRound(e.title);
      record(rounds[round], e.result, name);
    }
    if (e.type === "internship" && e.event_date) {
      if (e.event_date <= today) internshipAttended++;
      else internshipUpcoming++;
    }
  }
  for (const t of taskRes.data ?? []) {
    const name = companyName(t.companies as Joined);
    record(stat[t.stage ?? ""], t.result, name);
    if (t.stage === "面接")
      record(rounds[classifyInterviewRound(t.title ?? "")], t.result, name);
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
