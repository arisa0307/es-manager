"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCompany, updateCompany } from "@/lib/actions/companies";
import { deleteCompanyEvent } from "@/lib/actions/company-events";
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
import { CompanyEventNotes } from "./CompanyEventNotes";
import { buildCompanyUpcomingSchedule } from "@/lib/company-schedule";
import { buildCompanySelectionSteps } from "@/lib/company-selection";
import {
  buildCompanyEventScheduleEntries,
  getCompanyEventStatusText,
} from "@/lib/company-event-utils";
import { ESSubmissionForm } from "@/components/es/ESSubmissionForm";
import { ESSubmissionCard } from "@/components/es/ESSubmissionCard";
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
  formatTimeRange,
} from "@/lib/utils";
import {
  TASK_PRIORITY_LABELS,
  COMPANY_EVENT_TYPE_LABELS,
  type Company,
  type CompanyEvent,
  type CompanyEventType,
  type ESSubmissionWithDetails,
  type Task,
  type TaskPriority,
} from "@/types";

export function CompanyDetail({
  company,
  esSubmissions,
  tasks,
  events,
}: {
  company: Company;
  esSubmissions: ESSubmissionWithDetails[];
  tasks: Task[];
  events: CompanyEvent[];
}) {
  const router = useRouter();
  const [showES, setShowES] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showPastEvents, setShowPastEvents] = useState(false);
  // 既定は畳んだ状態。畳んでいる間は件名だけを一覧表示して中身が分かるようにする。
  const [tasksCollapsed, setTasksCollapsed] = useState(true);
  const [esCollapsed, setEsCollapsed] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isPending, startTransition] = useTransition();
  const upcomingItems = buildCompanyUpcomingSchedule(company, tasks, events);
  const selectionSteps = buildCompanySelectionSteps(tasks, events, esSubmissions);
  // 次のアクション未入力時に自動表示する、今日以降で最も近い予定
  const todayString = getTodayString();
  const nextUpcoming = upcomingItems.find((item) => item.date >= todayString);

  // 「予定・日程」を、日程が終わったもの(最終日 < 今日)とそれ以外に分ける。
  // 日程未定(日付なし)は終了扱いにしない。
  const eventLatestDate = (event: CompanyEvent): string | null => {
    const dates = buildCompanyEventScheduleEntries(event).map((e) => e.date);
    return dates.length ? dates.reduce((m, d) => (d > m ? d : m)) : null;
  };
  const pastEvents = events.filter((e) => {
    const d = eventLatestDate(e);
    return d !== null && d < todayString;
  });
  const currentEvents = events.filter((e) => !pastEvents.includes(e));

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
    if (!confirm("この日程をゴミ箱へ移動しますか？")) return;
    startTransition(() => deleteCompanyEvent(id));
  };

  const handleDeleteTask = (id: string, title: string) => {
    if (!confirm(`タスク「${title}」をゴミ箱へ移動しますか？`)) return;
    startTransition(() => deleteTask(id));
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
          <div className={isPending ? "opacity-60" : ""}>
            {currentEvents.length > 0 ? (
              <div className="space-y-2">
                {currentEvents.map((event) => (
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
            ) : (
              <p className="py-2 text-sm text-muted-foreground">
                これからの予定はありません
              </p>
            )}

            {pastEvents.length > 0 && (
              <div className="mt-3 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => setShowPastEvents((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span
                    className={`transition-transform ${showPastEvents ? "rotate-90" : ""}`}
                  >
                    ▶
                  </span>
                  終了した予定 {pastEvents.length}件を{showPastEvents ? "隠す" : "表示"}
                </button>
                {showPastEvents && (
                  <div className="mt-2 space-y-2 opacity-80">
                    {pastEvents.map((event) => (
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
              </div>
            )}
          </div>
        )}
      </Card>

      <Card id="company-tasks">
        <SectionHeader
          title="タスク"
          count={tasks.length}
          collapsed={tasksCollapsed}
          onToggle={() => setTasksCollapsed((v) => !v)}
          action={
            <Button
              size="sm"
              onClick={() => {
                setTasksCollapsed(false);
                setShowTask(!showTask);
              }}
            >
              {showTask ? "閉じる" : "+ 追加"}
            </Button>
          }
        />
        {!tasksCollapsed && showTask && (
          <div className="mb-4 pb-4 border-b border-border">
            <TaskForm
              companies={[{ id: company.id, name: company.name }]}
              defaultCompanyId={company.id}
              onSuccess={() => setShowTask(false)}
              onCancel={() => setShowTask(false)}
            />
          </div>
        )}
        {tasksCollapsed ? (
          tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">タスクがありません</p>
          ) : (
            <ul className="space-y-1">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="text-muted-foreground/60">・</span>
                  <span
                    className={`flex-1 min-w-0 truncate ${task.is_done ? "line-through" : "text-foreground"}`}
                  >
                    {task.title}
                  </span>
                  {task.result && (
                    <Badge className={`${getSelectionResultColor(task.result)} shrink-0`}>
                      {task.result}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : tasks.length === 0 ? (
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
                        ゴミ箱へ
                      </Button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </Card>

      <Card id="company-es">
        <SectionHeader
          title="ES"
          count={esSubmissions.length}
          collapsed={esCollapsed}
          onToggle={() => setEsCollapsed((v) => !v)}
          action={
            <Button
              size="sm"
              onClick={() => {
                setEsCollapsed(false);
                setShowES(!showES);
              }}
            >
              {showES ? "閉じる" : "+ ES提出"}
            </Button>
          }
        />
        {esCollapsed &&
          (esSubmissions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">ES提出がありません</p>
          ) : (
            <ul className="space-y-1">
              {esSubmissions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="text-muted-foreground/60">・</span>
                  <span className="flex-1 min-w-0 truncate text-foreground">
                    {s.title || "ES提出"}
                    <span className="text-muted-foreground">
                      （{s.phase}
                      {s.kind === "アンケート" ? "・アンケート" : ""}）
                    </span>
                  </span>
                  {s.result && (
                    <Badge className={`${getSelectionResultColor(s.result)} shrink-0`}>
                      {s.result}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          ))}
        {!esCollapsed && (
          <>
            <p className="-mt-2 mb-3 text-xs text-muted-foreground">
              インターン用・本選考用など「提出」ごとに作り、設問・結果・PDFをまとめます
            </p>
            {showES && (
              <div className="mb-4 pb-4 border-b border-border">
                <ESSubmissionForm
                  companies={[{ id: company.id, name: company.name }]}
                  defaultCompanyId={company.id}
                  onSuccess={() => setShowES(false)}
                  onCancel={() => setShowES(false)}
                />
              </div>
            )}
            {esSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">ES提出がありません</p>
            ) : (
              <div className="space-y-3">
                {esSubmissions.map((s) => (
                  <ESSubmissionCard
                    key={s.id}
                    submission={s}
                    companies={[{ id: company.id, name: company.name }]}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      <CompanyEventNotes events={events} />

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
    case "gd":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-300";
    case "interview":
      return "bg-pink-500/10 text-pink-700 dark:text-pink-300";
    case "other":
      return "bg-muted text-muted-foreground";
  }
}


function SectionHeader({
  title,
  action,
  count,
  collapsed,
  onToggle,
}: {
  title: string;
  action?: React.ReactNode;
  /** 件数バッジ(折りたたみ時に中身が分かるように) */
  count?: number;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1.5 text-sm font-medium text-foreground"
          aria-expanded={!collapsed}
        >
          <span
            className={`text-xs text-muted-foreground transition-transform ${collapsed ? "" : "rotate-90"}`}
          >
            ▸
          </span>
          {title}
          {typeof count === "number" && (
            <span className="text-muted-foreground font-normal">（{count}）</span>
          )}
        </button>
      ) : (
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
      )}
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
                {event.type === "interview" && event.interview_round
                  ? event.interview_round
                  : COMPANY_EVENT_TYPE_LABELS[event.type as CompanyEventType]}
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
              <details className="group/memo mt-2 rounded-md border border-border bg-card px-2.5 py-2">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
                  <span className="text-[10px] transition-transform group-open/memo:rotate-90">
                    ▶
                  </span>
                  事前メモ
                </summary>
                <div className="mt-1.5 text-sm text-foreground">
                  <LinkifiedText text={event.memo} />
                </div>
              </details>
            )}
            {event.report && (
              /* 全文は上の「参加後の記録」欄にまとまるので、ここでは冒頭だけ表示 */
              <div className="mt-2 line-clamp-2 rounded-md border border-border bg-card px-2.5 py-2 text-sm text-foreground">
                <span className="mr-1.5 text-xs font-medium text-muted-foreground">
                  参加後の記録
                </span>
                <LinkifiedText text={event.report} />
              </div>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="secondary" size="sm" onClick={onEdit} disabled={isPending}>
              編集
            </Button>
            <Button variant="danger" size="sm" onClick={onDelete} disabled={isPending}>
              ゴミ箱へ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
