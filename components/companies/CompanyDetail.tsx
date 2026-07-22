"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCompany, updateCompany } from "@/lib/actions/companies";
import { deleteCompanyEvent } from "@/lib/actions/company-events";
import { deleteES } from "@/lib/actions/es";
import { deleteTask, toggleTaskDone } from "@/lib/actions/tasks";
import { Badge } from "@/components/ui/Badge";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  CompanyFormFields,
  parseCompanyFormData,
} from "./CompanyFormFields";
import { CompanyInfoView } from "./CompanyInfoView";
import { InlineCompanyText } from "./InlineCompanyText";
import { CompanyEventForm } from "./CompanyEventForm";
import { CompanyUpcomingSchedule } from "./CompanyUpcomingSchedule";
import { CompanySelectionResults } from "./CompanySelectionResults";
import { buildCompanyUpcomingSchedule } from "@/lib/company-schedule";
import { buildCompanySelectionSteps } from "@/lib/company-selection";
import {
  buildCompanyEventScheduleEntries,
  getCompanyEventStatusText,
} from "@/lib/company-event-utils";
import { ESForm } from "@/components/es/ESForm";
import { TaskForm } from "@/components/tasks/TaskForm";
import {
  formatEventDateTime,
  getPriorityColor,
  getStatusColor,
  getLevelColor,
  getResultColor,
  getSelectionResultColor,
  formatDate,
  getTodayString,
  isOverdue,
  countWords,
  formatTags,
  formatTimeRange,
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
  const [editingInfo, setEditingInfo] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingEsId, setEditingEsId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isPending, startTransition] = useTransition();
  const upcomingItems = buildCompanyUpcomingSchedule(company, tasks, events);
  const selectionSteps = buildCompanySelectionSteps(tasks, events);
  // 次のアクション未入力時に自動表示する、今日以降で最も近い予定
  const todayString = getTodayString();
  const nextUpcoming = upcomingItems.find((item) => item.date >= todayString);

  const handleSaveCompany = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = parseCompanyFormData(new FormData(e.currentTarget));
    startSaveTransition(async () => {
      try {
        setSaveError(null);
        await updateCompany(company.id, data);
        setEditingInfo(false);
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

  const handleDeleteTask = (id: string, title: string) => {
    if (!confirm(`タスク「${title}」を削除しますか？`)) return;
    startTransition(() => deleteTask(id));
  };

  const handleDeleteES = (id: string) => {
    if (!confirm("このESを削除しますか？")) return;
    startTransition(() => deleteES(id));
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{company.name}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              直近の予定・タスクを上にまとめています。企業情報の編集は下でできます
            </p>
          </div>
          <Button variant="danger" size="sm" onClick={handleDelete} disabled={isPending}>
            削除
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={getStatusColor(company.status)}>{company.status}</Badge>
          {company.desired_level && (
            <Badge className={getLevelColor(company.desired_level)}>
              志望度 {company.desired_level}
            </Badge>
          )}
          {company.result && (
            <Badge className={getResultColor(company.result)}>{company.result}</Badge>
          )}
          <Badge className="bg-muted text-muted-foreground">
            {company.industry ?? "業界未設定"}
          </Badge>
          {company.deadline && (
            <span
              className={`text-xs ${isOverdue(company.deadline, false) ? "text-red-600 font-medium" : "text-muted-foreground"}`}
            >
              締切 {formatDate(company.deadline)}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            進捗状況
          </span>
          <InlineCompanyText companyId={company.id} value={company.progress_note} />
        </div>
        {company.next_action ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <span className="mt-0.5 shrink-0 text-xs font-medium text-amber-600 dark:text-amber-400">
              次のアクション
            </span>
            <span className="text-sm text-foreground">
              <LinkifiedText text={company.next_action} />
            </span>
          </div>
        ) : (
          nextUpcoming && (
            /* 手入力がなければ直近の予定・タスクから自動で表示する */
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <span className="mt-0.5 shrink-0 text-xs font-medium text-amber-600 dark:text-amber-400">
                次の予定（自動）
              </span>
              <span className="text-sm text-foreground">
                {nextUpcoming.label}: {nextUpcoming.title}（
                {formatDate(nextUpcoming.date)}
                {nextUpcoming.time ? ` ${nextUpcoming.time}` : ""}）
              </span>
            </div>
          )
        )}
      </Card>

      <CompanyUpcomingSchedule items={upcomingItems} />

      <CompanySelectionResults steps={selectionSteps} />

      <Card id="company-events">
        <SectionHeader
          title="予定・日程"
          action={
            <Button size="sm" onClick={() => setShowEvent(!showEvent)}>
              {showEvent ? "閉じる" : "+ 追加"}
            </Button>
          }
        />
        <p className="-mt-2 mb-3 text-xs text-muted-foreground">
          面接・インターン・説明会のほか、エントリー開始日など締切以外の予定も登録できます
        </p>
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
          <p className="text-sm text-muted-foreground py-2">予定がありません</p>
        ) : (
          <div className={`space-y-2 ${isPending ? "opacity-60" : ""}`}>
            {events.map((event) => (
              <EventCard
                key={event.id}
                companyId={company.id}
                event={event}
                editing={editingEventId === event.id}
                isPending={isPending}
                onEdit={() => {
                  setShowEvent(false);
                  setEditingEventId(event.id);
                }}
                onEditDone={() => setEditingEventId(null)}
                onDelete={() => handleDeleteEvent(event.id)}
              />
            ))}
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
          <div className={`space-y-2 ${isPending ? "opacity-60" : ""}`}>
            {tasks.map((task) =>
              editingTaskId === task.id ? (
                <div
                  key={task.id}
                  className="rounded-lg border border-border bg-muted/20 px-3 py-2.5"
                >
                  <TaskForm
                    companies={[{ id: company.id, name: company.name }]}
                    defaultCompanyId={company.id}
                    task={task}
                    onSuccess={() => setEditingTaskId(null)}
                    onCancel={() => setEditingTaskId(null)}
                  />
                </div>
              ) : (
                <div
                  key={task.id}
                  className="rounded-lg border border-border bg-muted/20 px-3 py-2.5"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.is_done}
                      onChange={() =>
                        startTransition(() =>
                          toggleTaskDone(task.id, !task.is_done)
                        )
                      }
                      className="mt-1 h-4 w-4 rounded border-border"
                      aria-label="完了/未完了"
                    />
                    <div className="min-w-0 flex-1">
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
                        <Badge
                          className={getPriorityColor(task.priority as TaskPriority)}
                        >
                          {TASK_PRIORITY_LABELS[task.priority as TaskPriority]}
                        </Badge>
                        {task.result && (
                          <Badge className={getSelectionResultColor(task.result)}>
                            {task.result}
                          </Badge>
                        )}
                        {task.deadline && (
                          <span
                            className={`text-xs ${isOverdue(task.deadline, task.is_done) ? "text-red-600" : "text-muted-foreground"}`}
                          >
                            {formatDate(task.deadline)}
                          </span>
                        )}
                      </div>
                      {task.memo && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <LinkifiedText text={task.memo} />
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowTask(false);
                          setEditingTaskId(task.id);
                        }}
                      >
                        編集
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteTask(task.id, task.title)}
                        disabled={isPending}
                      >
                        削除
                      </Button>
                    </div>
                  </div>
                </div>
              )
            )}
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
          <div className={`space-y-2 ${isPending ? "opacity-60" : ""}`}>
            {esList.map((es) => {
              if (editingEsId === es.id) {
                return (
                  <div
                    key={es.id}
                    className="rounded-lg border border-border bg-muted/20 px-3 py-2.5"
                  >
                    <ESForm
                      companies={[{ id: company.id, name: company.name }]}
                      defaultCompanyId={company.id}
                      es={es}
                      onSuccess={() => setEditingEsId(null)}
                      onCancel={() => setEditingEsId(null)}
                    />
                  </div>
                );
              }
              const words = countWords(es.answer);
              const over = es.word_count !== null && words > es.word_count;
              return (
                <div key={es.id} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-sm font-medium">{es.question}</p>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowES(false);
                          setEditingEsId(es.id);
                        }}
                      >
                        編集
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteES(es.id)}
                        disabled={isPending}
                      >
                        削除
                      </Button>
                    </div>
                  </div>
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

      <Card>
        <SectionHeader
          title="企業情報"
          action={
            !editingInfo && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingInfo(true)}
              >
                編集
              </Button>
            )
          }
        />
        {editingInfo ? (
          <form
            key={`${company.id}-${company.updated_at}`}
            onSubmit={handleSaveCompany}
            className="space-y-3"
          >
            {saveError && (
              <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">
                {saveError}
              </p>
            )}
            <CompanyFormFields company={company} />
            <div className="flex gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "保存中..." : "変更を保存"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSaveError(null);
                  setEditingInfo(false);
                }}
                disabled={isSaving}
              >
                キャンセル
              </Button>
            </div>
          </form>
        ) : (
          <CompanyInfoView company={company} />
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
    case "info_session":
      return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "internship":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "es":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "web_test":
      return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
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

function EventCard({
  companyId,
  event,
  editing,
  isPending,
  onEdit,
  onEditDone,
  onDelete,
}: {
  companyId: string;
  event: CompanyEvent;
  editing: boolean;
  isPending: boolean;
  onEdit: () => void;
  onEditDone: () => void;
  onDelete: () => void;
}) {
  const scheduleEntries = buildCompanyEventScheduleEntries(event);

  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
      {editing ? (
        <CompanyEventForm
          companyId={companyId}
          event={event}
          onSuccess={onEditDone}
          onCancel={onEditDone}
        />
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getEventTypeColor(event.type)}>
                {COMPANY_EVENT_TYPE_LABELS[event.type as CompanyEventType]}
              </Badge>
              <p className="text-sm font-medium">{event.title}</p>
              {event.result && (
                <Badge className={getSelectionResultColor(event.result)}>
                  {event.result}
                </Badge>
              )}
            </div>
            {scheduleEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">日程未定</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {scheduleEntries.map((entry, index) => (
                  <li
                    key={entry.id}
                    className="text-xs text-muted-foreground flex flex-wrap items-center gap-2"
                  >
                    <span className="font-medium text-foreground/80">
                      {getCompanyEventStatusText(entry)}
                      {entry.isCandidate &&
                        ` ${
                          scheduleEntries.filter(
                            (candidate, candidateIndex) =>
                              candidate.isCandidate && candidateIndex <= index
                          ).length
                        }`}
                    </span>
                    <span>
                      {formatEventDateTime(
                        entry.date,
                        entry.startTime,
                        entry.endTime
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {!scheduleEntries.length && (event.event_time || event.event_end_time) && (
              <p className="text-xs text-muted-foreground mt-1">
                時間 {formatTimeRange(event.event_time, event.event_end_time)}
              </p>
            )}
            {event.memo && (
              <div className="mt-2 rounded-md border border-border bg-card px-2.5 py-2 text-sm text-foreground">
                <LinkifiedText text={event.memo} />
              </div>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="secondary" size="sm" onClick={onEdit} disabled={isPending}>
              編集
            </Button>
            <Button variant="danger" size="sm" onClick={onDelete} disabled={isPending}>
              削除
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
