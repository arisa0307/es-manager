"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCompany, updateCompany } from "@/lib/actions/companies";
import { deleteCompanyEvent } from "@/lib/actions/company-events";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  CompanyFormFields,
  parseCompanyFormData,
} from "./CompanyFormFields";
import { CompanyEventForm } from "./CompanyEventForm";
import { CompanyUpcomingSchedule } from "./CompanyUpcomingSchedule";
import { buildCompanyUpcomingSchedule } from "@/lib/company-schedule";
import { ESForm } from "@/components/es/ESForm";
import { TaskForm } from "@/components/tasks/TaskForm";
import {
  formatEventDateTime,
  getPriorityColor,
  formatDate,
  isOverdue,
  countWords,
  formatTags,
} from "@/lib/utils";
import {
  TASK_PRIORITY_LABELS,
  COMPANY_EVENT_TYPE_LABELS,
  type Company,
  type CompanyEvent,
  type CompanyEventType,
  type ES,
  type Task,
  type TaskPriority,
} from "@/types";

export function CompanyDetail({
  company,
  esList,
  tasks,
  events,
}: {
  company: Company;
  esList: ES[];
  tasks: Task[];
  events: CompanyEvent[];
}) {
  const router = useRouter();
  const [showES, setShowES] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isPending, startTransition] = useTransition();
  const upcomingItems = buildCompanyUpcomingSchedule(company, tasks, events);

  const handleSaveCompany = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = parseCompanyFormData(new FormData(e.currentTarget));
    startSaveTransition(async () => {
      try {
        setSaveError(null);
        await updateCompany(company.id, data);
        router.refresh();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "エラーが発生しました");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`「${company.name}」を削除しますか？`)) return;
    startTransition(async () => {
      await deleteCompany(company.id);
      router.push("/companies");
    });
  };

  const handleDeleteEvent = (id: string) => {
    if (!confirm("この日程を削除しますか？")) return;
    startTransition(() => deleteCompanyEvent(id));
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{company.name}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              下のフォームから直接編集できます
            </p>
          </div>
          <Button variant="danger" size="sm" onClick={handleDelete} disabled={isPending}>
            削除
          </Button>
        </div>

        <form
          key={`${company.id}-${company.updated_at}`}
          onSubmit={handleSaveCompany}
          className="space-y-3"
        >
          {saveError && (
            <p className="text-sm text-red-600 bg-red-500/10 rounded-md px-3 py-2">
              {saveError}
            </p>
          )}
          <CompanyFormFields company={company} />
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "保存中..." : "変更を保存"}
          </Button>
        </form>
      </Card>

      <CompanyUpcomingSchedule items={upcomingItems} />

      <Card id="company-events">
        <SectionHeader
          title="インターン・面接日程"
          action={
            <Button size="sm" onClick={() => setShowEvent(!showEvent)}>
              {showEvent ? "閉じる" : "+ 追加"}
            </Button>
          }
        />
        {showEvent && !editingEventId && (
          <div className="mb-4 pb-4 border-b border-border">
            <CompanyEventForm
              companyId={company.id}
              onSuccess={() => setShowEvent(false)}
              onCancel={() => setShowEvent(false)}
            />
          </div>
        )}
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">日程がありません</p>
        ) : (
          <div className={`space-y-2 ${isPending ? "opacity-60" : ""}`}>
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-border bg-muted/20 px-3 py-2.5"
              >
                {editingEventId === event.id ? (
                  <CompanyEventForm
                    companyId={company.id}
                    event={event}
                    onSuccess={() => setEditingEventId(null)}
                    onCancel={() => setEditingEventId(null)}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={getEventTypeColor(event.type)}>
                          {COMPANY_EVENT_TYPE_LABELS[event.type as CompanyEventType]}
                        </Badge>
                        <p className="text-sm font-medium">{event.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatEventDateTime(event.event_date, event.event_time)}
                        </span>
                      </div>
                      {event.memo && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-2">
                          {event.memo}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setShowEvent(false);
                          setEditingEventId(event.id);
                        }}
                        disabled={isPending}
                      >
                        編集
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteEvent(event.id)}
                        disabled={isPending}
                      >
                        削除
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader
          title="ES"
          action={
            <Button size="sm" onClick={() => setShowES(!showES)}>
              {showES ? "閉じる" : "+ 追加"}
            </Button>
          }
        />
        {showES && (
          <div className="mb-4 pb-4 border-b border-border">
            <ESForm
              companies={[{ id: company.id, name: company.name }]}
              defaultCompanyId={company.id}
              onSuccess={() => setShowES(false)}
              onCancel={() => setShowES(false)}
            />
          </div>
        )}
        {esList.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">ESがありません</p>
        ) : (
          <div className="space-y-2">
            {esList.map((es) => {
              const words = countWords(es.answer);
              const over = es.word_count !== null && words > es.word_count;
              return (
                <div key={es.id} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                  <p className="text-sm font-medium">{es.question}</p>
                  {es.tags && es.tags.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{formatTags(es.tags)}</p>
                  )}
                  <Badge
                    className={`mt-2 ${over ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground"}`}
                  >
                    {words}
                    {es.word_count !== null && ` / ${es.word_count}`} 文字
                  </Badge>
                  {es.base_es && (
                    <p className="text-xs text-muted-foreground mt-1">ベース: {es.base_es}</p>
                  )}
                  {es.answer && (
                    <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                      {es.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card id="company-tasks">
        <SectionHeader
          title="タスク"
          action={
            <Button size="sm" onClick={() => setShowTask(!showTask)}>
              {showTask ? "閉じる" : "+ 追加"}
            </Button>
          }
        />
        {showTask && (
          <div className="mb-4 pb-4 border-b border-border">
            <TaskForm
              companies={[{ id: company.id, name: company.name }]}
              defaultCompanyId={company.id}
              onSuccess={() => setShowTask(false)}
              onCancel={() => setShowTask(false)}
            />
          </div>
        )}
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">タスクがありません</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={
                      task.is_done
                        ? "line-through text-muted-foreground text-sm"
                        : "font-medium text-sm"
                    }
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
              </div>
            ))}
          </div>
        )}
      </Card>

      <Link href="/companies" className="text-sm text-muted-foreground hover:underline">
        ← 企業一覧
      </Link>
    </div>
  );
}

function getEventTypeColor(type: CompanyEventType): string {
  switch (type) {
    case "internship":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "interview":
      return "bg-pink-500/10 text-pink-700 dark:text-pink-300";
    case "other":
      return "bg-muted text-muted-foreground";
  }
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
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      {action}
    </div>
  );
}
