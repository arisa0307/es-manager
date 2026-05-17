"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCompany } from "@/lib/actions/companies";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CompanyForm } from "./CompanyForm";
import { CompanyLocalSection } from "./CompanyLocalSection";
import { ESForm } from "@/components/es/ESForm";
import { TaskForm } from "@/components/tasks/TaskForm";
import {
  formatDateFull,
  getStatusColor,
  getLevelColor,
  getPriorityColor,
  formatDate,
  isOverdue,
  countWords,
  formatTags,
} from "@/lib/utils";
import {
  TASK_PRIORITY_LABELS,
  type Company,
  type CompanyStatus,
  type DesiredLevel,
  type ES,
  type Task,
  type TaskPriority,
} from "@/types";

export function CompanyDetail({
  company,
  esList,
  tasks,
}: {
  company: Company;
  esList: ES[];
  tasks: Task[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [showES, setShowES] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm(`「${company.name}」を削除しますか？`)) return;
    startTransition(async () => {
      await deleteCompany(company.id);
      router.push("/companies");
    });
  };

  if (editing) {
    return (
      <Card>
        <CompanyForm
          company={company}
          onSuccess={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground">
              {company.name}
            </h1>
            {company.industry && (
              <p className="text-muted-foreground mt-1">{company.industry}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {company.desired_level && (
                <Badge
                  className={getLevelColor(company.desired_level as DesiredLevel)}
                >
                  志望度 {company.desired_level}
                </Badge>
              )}
              <Badge className={getStatusColor(company.status as CompanyStatus)}>
                {company.status}
              </Badge>
              {company.result && (
                <Badge className="bg-muted text-muted-foreground">
                  {company.result}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              編集
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={isPending}>
              削除
            </Button>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {company.url && (
            <>
              <dt className="text-muted-foreground">URL</dt>
              <dd>
                <a
                  href={company.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline truncate block"
                >
                  {company.url}
                </a>
              </dd>
            </>
          )}
          {company.salary && (
            <>
              <dt className="text-muted-foreground">年収・待遇</dt>
              <dd>{company.salary}</dd>
            </>
          )}
          {company.deadline && (
            <>
              <dt className="text-muted-foreground">締切</dt>
              <dd
                className={
                  isOverdue(company.deadline, false) ? "text-red-600 font-medium" : ""
                }
              >
                {formatDateFull(company.deadline)}
              </dd>
            </>
          )}
          {company.next_action && (
            <>
              <dt className="text-muted-foreground col-span-2">次のアクション</dt>
              <dd className="col-span-2 whitespace-pre-wrap">{company.next_action}</dd>
            </>
          )}
        </dl>
      </Card>

      <section>
        <SectionHeader
          title="ES"
          action={
            <Button size="sm" onClick={() => setShowES(!showES)}>
              {showES ? "閉じる" : "+ 追加"}
            </Button>
          }
        />
        {showES && (
          <Card className="mb-3">
            <ESForm
              companies={[{ id: company.id, name: company.name }]}
              defaultCompanyId={company.id}
              onSuccess={() => setShowES(false)}
              onCancel={() => setShowES(false)}
            />
          </Card>
        )}
        {esList.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">ESがありません</p>
        ) : (
          <div className="space-y-2">
            {esList.map((es) => {
              const words = countWords(es.answer);
              const over =
                es.word_count !== null && words > es.word_count;
              return (
                <Card key={es.id}>
                  <p className="text-sm font-medium">{es.question}</p>
                  {es.tags && es.tags.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTags(es.tags)}
                    </p>
                  )}
                  <Badge
                    className={`mt-2 ${over ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground"}`}
                  >
                    {words}
                    {es.word_count !== null && ` / ${es.word_count}`} 文字
                  </Badge>
                  {es.base_es && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ベース: {es.base_es}
                    </p>
                  )}
                  {es.answer && (
                    <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                      {es.answer}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionHeader
          title="タスク"
          action={
            <Button size="sm" onClick={() => setShowTask(!showTask)}>
              {showTask ? "閉じる" : "+ 追加"}
            </Button>
          }
        />
        {showTask && (
          <Card className="mb-3">
            <TaskForm
              companies={[{ id: company.id, name: company.name }]}
              defaultCompanyId={company.id}
              onSuccess={() => setShowTask(false)}
              onCancel={() => setShowTask(false)}
            />
          </Card>
        )}
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">タスクがありません</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <Card key={task.id}>
                <div className="flex items-center gap-2">
                  <span
                    className={task.is_done ? "line-through text-muted-foreground" : "font-medium text-sm"}
                  >
                    {task.title}
                  </span>
                  <Badge className={getPriorityColor(task.priority as TaskPriority)}>
                    {TASK_PRIORITY_LABELS[task.priority as TaskPriority]}
                  </Badge>
                  {task.deadline && (
                    <span
                      className={`text-xs ${isOverdue(task.deadline, task.is_done) ? "text-red-600" : "text-muted-foreground"}`}
                    >
                      {formatDate(task.deadline)}
                    </span>
                  )}
                </div>
                {task.memo && (
                  <p className="text-xs text-muted-foreground mt-1">{task.memo}</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Webテスト・ログイン情報（ローカル）" />
        <CompanyLocalSection companyId={company.id} />
      </section>

      <Link href="/companies" className="text-sm text-muted-foreground hover:underline">
        ← 企業一覧
      </Link>
    </div>
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-medium text-foreground">{title}</h2>
      {action}
    </div>
  );
}
