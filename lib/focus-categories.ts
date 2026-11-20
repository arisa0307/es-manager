import type { FocusFixedSubject, TaskCategory } from "@/types";

/**
 * /focus の時間計測の集計カテゴリ(科目)。group で「就活」「勉強」の2つにまとめる。
 * 色は app/globals.css の --focus-cat-* (ライト/ダーク別に検証済みのカテゴリ色)。
 */
export const FOCUS_CATEGORIES = [
  { id: "shukatsu", group: "shukatsu", label: "就活", color: "var(--focus-cat-1)" },
  { id: "webtest", group: "study", label: "Webテスト対策", color: "var(--focus-cat-2)" },
  { id: "fe", group: "study", label: "基本情報技術者", color: "var(--focus-cat-3)" },
  { id: "kokushi", group: "study", label: "国試", color: "var(--focus-cat-4)" },
  { id: "study_other", group: "study", label: "勉強（その他）", color: "var(--focus-cat-5)" },
] as const;

export type FocusCategoryId = (typeof FOCUS_CATEGORIES)[number]["id"];
export type FocusGroupId = (typeof FOCUS_CATEGORIES)[number]["group"];

export const FOCUS_GROUPS: { id: FocusGroupId; label: string }[] = [
  { id: "shukatsu", label: "就活" },
  { id: "study", label: "勉強" },
];

export function groupOf(category: string): FocusGroupId {
  return FOCUS_CATEGORIES.find((c) => c.id === category)?.group ?? "study";
}

const SUBJECT_CATEGORY: Record<FocusFixedSubject, FocusCategoryId> = {
  基本情報技術者: "fe",
  国試: "kokushi",
  Webテスト対策: "webtest",
};

const WEBTEST_KEYWORDS = ["SPI", "TG-WEB", "玉手箱", "CUBIC", "適性", "WEBテスト"];

/**
 * 計測1件の科目を決める(主・副の区別は使わない)。
 * - task_id が null(固定項目): note がそのまま科目
 * - category='shukatsu' → 就活、category='fe' → 基本情報技術者
 * - それ以外は title で判定: Webテスト系の語 → Webテスト対策、「国試」→ 国試、
 *   「基本情報」→ 基本情報技術者、どれでもなければ 勉強（その他）
 * category が未設定のタスクは就活として扱う(企業タスクの既定)。
 */
export function classifySession(
  task: { title: string; category?: TaskCategory | null } | null,
  note: string | null
): FocusCategoryId {
  if (!task) {
    return note && note in SUBJECT_CATEGORY
      ? SUBJECT_CATEGORY[note as FocusFixedSubject]
      : "study_other";
  }
  if (task.category === "shukatsu" || !task.category) return "shukatsu";
  if (task.category === "fe") return "fe";
  const title = task.title.toUpperCase();
  if (WEBTEST_KEYWORDS.some((k) => title.includes(k))) return "webtest";
  if (title.includes("国試")) return "kokushi";
  if (title.includes("基本情報")) return "fe";
  return "study_other";
}

/** 秒 → "1:23:45"(1時間未満は "23:45") */
export function formatElapsed(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = r.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/** 秒 → "2時間15分" / "45分" */
export function formatDuration(sec: number): string {
  const totalMin = Math.round(Math.max(0, sec) / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}分`;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

/** 秒 → "≒2.4ポモ"(分÷25、小数1桁) */
export function formatPomoEquivalent(sec: number): string {
  return `≒${(Math.max(0, sec) / 60 / 25).toFixed(1)}ポモ`;
}

/** ISO → datetime-local 用の "YYYY-MM-DDTHH:mm"(JST固定。サーバ/クライアントで同じ値になる) */
export function toJstInputValue(iso: string): string {
  const d = new Date(Date.parse(iso) + 9 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

/** datetime-local の値(JSTとして解釈) → ISO */
export function fromJstInputValue(value: string): string {
  return new Date(`${value}:00+09:00`).toISOString();
}

/** ISO → "15:07"(JST) */
export function formatJstTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
  });
}
