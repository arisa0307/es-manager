"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
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

  // 親タスクの直後に子タスクを並べ、子はインデントして表示する。
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const childrenOf = new Map<string, TaskWithCompany[]>();
  const roots: TaskWithCompany[] = [];
  for (const t of tasks) {
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
                onChange={() => startTransition(() => toggleTaskDone(task.id, !task.is_done))}
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
                <Button variant="danger" size="sm" onClick={() => { if (confirm("削除？")) startTransition(() => deleteTask(task.id)); }}>削除</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
