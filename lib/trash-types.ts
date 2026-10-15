// ゴミ箱の種別・ラベル・型。"use server" ファイルから分離(サーバーアクション以外を
// エクスポートできないため)。

export type TrashKind = "task" | "company_event" | "general_event";

export type TrashItem = {
  kind: TrashKind;
  id: string;
  title: string;
  company: string | null;
  date: string | null;
  deletedAt: string;
};

const KIND_LABELS: Record<TrashKind, string> = {
  task: "タスク",
  company_event: "企業の予定",
  general_event: "予定",
};

export function trashKindLabel(kind: TrashKind): string {
  return KIND_LABELS[kind];
}
