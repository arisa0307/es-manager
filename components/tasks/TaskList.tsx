"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { deleteTask, toggleTaskDone } from "@/lib/actions/tasks";
import { Badge } from "@/components/ui/Badge";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskForm } from "./TaskForm";
import { formatDate, getPriorityColor, getSelectionResultColor, isOverdue } from "@/lib/utils";
import {
  DESIRED_LEVEL_LABELS,
  TASK_KIND_LABELS,
  TASK_PRIORITY_LABELS,
  type Company,
  type DesiredLevel,
  type TaskKind,
  type TaskPriority,
  type TaskWithCompany,
} from "@/types";

export function TaskList({
  tasks,
  companies,
}: {
  tasks: TaskWithCompany[];
  companies: Pick<Company, "id" | "name">[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TaskWithCompany | null>(null);
  const [isPending, startTransition] = useTransition();

  // 楽観的更新: クリック直後に画面へ反映し、サーバ往復(約1.5〜2秒)を待たせない。
  // サーバ側の再検証が終わると props が更新され、自動的に実データへ同期される。
  type TaskAction =
    | { type: "toggle"; id: string; value: boolean }
    | { type: "delete"; id: string };
  const [optimisticTasks, applyOptimistic] = useOptimistic(
    tasks,
    (state: TaskWithCompany[], action: TaskAction) => {
      if (action.type === "toggle") {
        return state.map((t) =>
          t.id === action.id ? { ...t, is_done: action.value } : t
        );
      }
      // 削除(ゴミ箱へ): 親と子を一覧から消す
      return state.filter(
        (t) => t.id !== action.id && t.parent_task_id !== action.id
      );
    }
  );

  const toggleDone = (id: string, value: boolean) =>
    startTransition(async () => {
      applyOptimistic({ type: "toggle", id, value });
      await toggleTaskDone(id, value);
    });
  const removeTask = (id: string) =>
    startTransition(async () => {
      applyOptimistic({ type: "delete", id });
      await deleteTask(id);
    });

  // 完了済みは折りたたみのコンパクト表示にまとめ、未完了だけをカードで並べる。
  const activeTasks = optimisticTasks.filter((t) => !t.is_done);
  const doneTasks = optimisticTasks.filter((t) => t.is_done);

  // 親タスクの直後に子タスクを並べ、子はインデントして表示する(未完了のみ)。
  const byId = new Map(activeTasks.map((t) => [t.id, t]));
  const childrenOf = new Map<string, TaskWithCompany[]>();
  const roots: TaskWithCompany[] = [];
  for (const t of activeTasks) {
    const pid = t.parent_task_id;
    if (pid && byId.has(pid)) {
      const arr = childrenOf.get(pid) ?? [];
      arr.push(t);
      childrenOf.set(pid, arr);
    } else {
      roots.push(t);
    }
  }
  const ordered: { task: TaskWithCompany; depth: number }[] = [];
  for (const r of roots) {
    ordered.push({ task: r, depth: 0 });
    for (const c of childrenOf.get(r.id) ?? []) {
      ordered.push({ task: c, depth: 1 });
    }
  }

  if (tasks.length === 0 && !showForm) {
    return (
      <EmptyState
        title="タスクがありません"
        action={<Button onClick={() => setShowForm(true)}>タスクを追加</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      {(showForm || editing) && (
        <Card>
          <TaskForm
            companies={companies}
            task={editing ?? undefined}
            onSuccess={() => { setShowForm(false); setEditing(null); }}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </Card>
      )}
      {!showForm && !editing && <Button onClick={() => setShowForm(true)}>+ タスク追加</Button>}
      <div className={`space-y-2 ${isPending ? "opacity-60" : ""}`}>
        {ordered.map(({ task, depth }) => (
          <Card
            key={task.id}
            className={`${task.is_done ? "opacity-60" : ""} ${depth > 0 ? "ml-6 border-l-2 border-l-accent/30" : ""}`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={task.is_done}
                onChange={() => toggleDone(task.id, !task.is_done)}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.is_done ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </p>
                {task.memo && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <LinkifiedText text={task.memo} />
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-1.5">
                  <Badge className={getPriorityColor(task.priority as TaskPriority)}>
                    {TASK_PRIORITY_LABELS[task.priority as TaskPriority]}
                  </Badge>
                  {task.kind && task.kind !== "next" && (
                    <Badge className="bg-muted text-muted-foreground">
                      {TASK_KIND_LABELS[task.kind as TaskKind]}
                      {task.kind === "waiting" && task.waiting_on
                        ? `：${task.waiting_on}`
                        : ""}
                    </Badge>
                  )}
                  {typeof task.est_pomos === "number" && (
                    <Badge className="bg-muted text-muted-foreground">
                      {task.est_pomos === 0 ? "小" : `${task.est_pomos}ポモ`}
                    </Badge>
                  )}
                  {task.result && (
                    <Badge className={getSelectionResultColor(task.result)}>
                      {task.result}
                    </Badge>
                  )}
                  {task.deadline && (
                    <span className={`text-xs ${isOverdue(task.deadline, task.is_done) ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                      {formatDate(task.deadline)}
                    </span>
                  )}
                  {task.companies && (
                    <Link href={`/companies/${task.companies.id}`} className="text-xs text-muted-foreground hover:underline">
                      {task.companies.name}
                    </Link>
                  )}
                  {task.companies?.desired_level && (
                    <span className="text-xs text-muted-foreground">
                      志望度 {DESIRED_LEVEL_LABELS[task.companies.desired_level as DesiredLevel]}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(task)}>編集</Button>
                <Button variant="danger" size="sm" onClick={() => { if (confirm("ゴミ箱へ移動しますか？")) removeTask(task.id); }}>ゴミ箱へ</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {doneTasks.length > 0 && (
        <details open={ordered.length === 0} className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <span className="transition-transform group-open:rotate-90">▸</span>
            完了済み（{doneTasks.length}）
          </summary>
          <div className={`mt-2 space-y-1 ${isPending ? "opacity-60" : ""}`}>
            {doneTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/60"
              >
                <input
                  type="checkbox"
                  checked
                  onChange={() => toggleDone(task.id, false)}
                  className="h-4 w-4 shrink-0 rounded border-border"
                />
                <span className="flex-1 min-w-0 truncate text-muted-foreground line-through">
                  {task.companies && (
                    <Link
                      href={`/companies/${task.companies.id}`}
                      className="hover:underline"
                    >
                      {task.companies.name}
                    </Link>
                  )}
                  {task.companies && "・"}
                  {task.title}
                </span>
                {task.deadline && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(task.deadline)}
                  </span>
                )}
                <button
                  onClick={() => {
                    if (confirm("ゴミ箱へ移動しますか？")) removeTask(task.id);
                  }}
                  className="shrink-0 text-xs text-muted-foreground hover:text-red-600"
                >
                  ゴミ箱へ
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
