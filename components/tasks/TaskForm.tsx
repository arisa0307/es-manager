"use client";

import { useState, useTransition } from "react";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OptionalDateField } from "@/components/ui/OptionalDateField";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  SELECTION_RESULTS,
  TASK_CATEGORIES,
  TASK_CATEGORY_LABELS,
  TASK_KINDS,
  TASK_KIND_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STAGES,
  type Company,
  type Task,
  type TaskCategory,
  type TaskKind,
  type TaskPriority,
} from "@/types";

export function TaskForm({
  companies,
  task,
  defaultCompanyId,
  onSuccess,
  onCancel,
}: {
  companies: Pick<Company, "id" | "name">[];
  task?: Task;
  defaultCompanyId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const estPomosRaw = (form.get("est_pomos") as string)?.trim();
    const data = {
      title: form.get("title") as string,
      memo: (form.get("memo") as string) || null,
      deadline: (form.get("deadline") as string) || null,
      priority: form.get("priority") as TaskPriority,
      result: (form.get("result") as string) || null,
      stage: (form.get("stage") as string) || null,
      kind: (form.get("kind") as TaskKind) || null,
      category: (form.get("category") as TaskCategory) || null,
      est_pomos: estPomosRaw === "" ? null : Number(estPomosRaw),
      waiting_on: (form.get("waiting_on") as string)?.trim() || null,
      show_on_calendar: ((): boolean | null => {
        const v = form.get("show_on_calendar") as string;
        if (v === "always") return true;
        if (v === "never") return false;
        return null;
      })(),
      company_id: (form.get("company_id") as string) || defaultCompanyId || null,
    };

    startTransition(async () => {
      try {
        if (task) await updateTask(task.id, data);
        else await createTask(data);
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <p className="text-sm text-red-600 bg-red-500/10 rounded-md px-3 py-2">{error}</p>
      )}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">タイトル *</label>
        <Input name="title" required defaultValue={task?.title} />
      </div>
      {!defaultCompanyId && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">企業</label>
          <Select name="company_id" defaultValue={task?.company_id ?? ""}>
            <option value="">なし</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">締切・期日</label>
          <OptionalDateField name="deadline" defaultValue={task?.deadline} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">優先度</label>
          <Select name="priority" defaultValue={task?.priority ?? "mid"}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">種別</label>
          <Select name="kind" defaultValue={task?.kind ?? "next"}>
            {TASK_KINDS.map((k) => (
              <option key={k} value={k}>{TASK_KIND_LABELS[k]}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">分類</label>
          <Select name="category" defaultValue={task?.category ?? "shukatsu"}>
            {TASK_CATEGORIES.map((c) => (
              <option key={c} value={c}>{TASK_CATEGORY_LABELS[c]}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            見積ポモ
          </label>
          <Input
            type="number"
            name="est_pomos"
            min={0}
            defaultValue={task?.est_pomos ?? 1}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            待ちの相手（「待ち」のとき）
          </label>
          <Input
            name="waiting_on"
            placeholder="例: claude / 企業名"
            defaultValue={task?.waiting_on ?? ""}
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            カレンダー表示
          </label>
          <Select
            name="show_on_calendar"
            defaultValue={
              task?.show_on_calendar === true
                ? "always"
                : task?.show_on_calendar === false
                  ? "never"
                  : "auto"
            }
          >
            <option value="auto">自動（見積ポモ1以上なら表示）</option>
            <option value="always">常に表示</option>
            <option value="never">表示しない</option>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            選考種別
          </label>
          <Select name="stage" defaultValue={task?.stage ?? ""}>
            <option value="">—（通常タスク）</option>
            {TASK_STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            選考結果
          </label>
          <Select name="result" defaultValue={task?.result ?? ""}>
            {SELECTION_RESULTS.map((r) => (
              <option key={r} value={r}>{r || "—"}</option>
            ))}
          </Select>
        </div>
      </div>
      <p className="-mt-1 text-xs text-muted-foreground">
        SPI等の適性試験・GD・面接をタスク管理する場合、選考種別を設定すると通過率に反映されます
      </p>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">メモ</label>
        <Textarea name="memo" rows={2} defaultValue={task?.memo ?? ""} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中..." : task ? "更新" : "追加"}
        </Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>キャンセル</Button>}
      </div>
    </form>
  );
}
