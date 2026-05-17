"use client";

import { useState, useTransition } from "react";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, type Company, type Task, type TaskPriority } from "@/types";

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
    const data = {
      title: form.get("title") as string,
      memo: (form.get("memo") as string) || null,
      deadline: (form.get("deadline") as string) || null,
      priority: form.get("priority") as TaskPriority,
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
          <label className="block text-xs text-muted-foreground mb-1">締切</label>
          <Input type="date" name="deadline" defaultValue={task?.deadline ?? ""} />
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
