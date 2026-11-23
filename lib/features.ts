/**
 * 利用者ごとに出し分ける「個人向け機能」の一覧。
 *
 * 就活の管理に必要な基本機能（企業・ES・タスク・予定・カレンダー・テンプレ・ゴミ箱など）は
 * ここに入れず、常に表示する。ここに並べるのは、作成者の運用に合わせて作った機能だけ。
 *
 * - 設定は user_settings.features（jsonb）に { "focus": true, ... } の形で保存する。
 * - 保存されていないキーは defaultOn を使う（新しく使い始めた学生は全部オフ）。
 * - オフにしても、その機能のデータは消さない。オンに戻せば元どおり表示される。
 */
export const PERSONAL_FEATURES = [
  {
    key: "focus",
    label: "集中タイマー",
    description:
      "「集中」画面（ポモドーロ・ストップウォッチと時間の集計）と、タスクの「見積ポモ」欄・バッジを表示します。",
    defaultOn: false,
  },
  {
    key: "study_categories",
    label: "タスクの分類（就活・基本情報・実習）",
    description:
      "タスクに「就活／基本情報／実習／その他」の分類を付けられるようにします。就活以外の勉強も同じタスク一覧で管理したい人向けです。",
    defaultOn: false,
  },
  {
    key: "gtd",
    label: "タスクの種別（次の行動・待ち・いつか）",
    description:
      "タスクを「次の行動／待ち／いつか」に分け、「待ち」の相手を記録できるようにします。一覧の絞り込みにも種別が出ます。",
    defaultOn: false,
  },
  {
    key: "ai_next_actions",
    label: "AIで次の一手を整理",
    description:
      "ホームの「今日の推奨アクション」に「AIで整理」ボタンを出し、Gemini で優先順位をまとめます。",
    defaultOn: false,
  },
  {
    key: "health_log",
    label: "健康ログの受け取り",
    description:
      "iPhone のショートカットなどから /api/health に体重・摂取カロリー・歩数を送って記録できるようにします（画面はありません）。",
    defaultOn: false,
  },
] as const;

export type FeatureKey = (typeof PERSONAL_FEATURES)[number]["key"];
export type FeatureFlags = Record<FeatureKey, boolean>;

export const FEATURE_KEYS = PERSONAL_FEATURES.map((f) => f.key) as FeatureKey[];

export function isFeatureKey(value: unknown): value is FeatureKey {
  return typeof value === "string" && (FEATURE_KEYS as string[]).includes(value);
}

/** 保存値（jsonb）を、全キーがそろったフラグに直す。知らないキーや型違いは無視する。 */
export function resolveFeatureFlags(stored: unknown): FeatureFlags {
  const obj =
    stored && typeof stored === "object" && !Array.isArray(stored)
      ? (stored as Record<string, unknown>)
      : {};
  const flags = {} as FeatureFlags;
  for (const f of PERSONAL_FEATURES) {
    const v = obj[f.key];
    flags[f.key] = typeof v === "boolean" ? v : f.defaultOn;
  }
  return flags;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = resolveFeatureFlags(null);
