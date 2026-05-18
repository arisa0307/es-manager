"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCompany } from "@/lib/actions/companies";
import {
  createCompanyEvent,
  deleteCompanyEvent,
} from "@/lib/actions/company-events";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
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
  COMPANY_EVENT_TYPE_LABELS,
  COMPANY_EVENT_TYPES,
  type Company,
  type CompanyEvent,
  type CompanyEventType,
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
  events,
}: {
  company: Company;
  esList: ES[];
  tasks: Task[];
  events: CompanyEvent[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [showES, setShowES] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [isPending, startTransition] = useTransition();
  const upcomingEvent = getUpcomingEvent(events);

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

        <div className="mt-5 rounded-xl border border-accent/30 bg-accent/5 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-xs font-medium text-accent">重要項目</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                次に確認すべき情報をまとめています
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <ImportantItem
              label="締切"
              value={company.deadline ? formatDateFull(company.deadline) : "—"}
              alert={isOverdue(company.deadline, false)}
            />
            <ImportantItem
              label="直近の日程"
              value={
                upcomingEvent
                  ? `${formatDateFull(upcomingEvent.event_date)} / ${
                      COMPANY_EVENT_TYPE_LABELS[
                        upcomingEvent.type as CompanyEventType
                      ]
                    }`
                  : "—"
              }
              subValue={upcomingEvent?.title}
            />
            <ImportantItem
              label="次のアクション"
              value={company.next_action ?? "—"}
              multiline
            />
          </div>

          <div className="mt-3 rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              企業メモ
            </p>
            <p className="text-sm whitespace-pre-wrap">
              {company.memo ?? <span className="text-muted-foreground">—</span>}
            </p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">URL</dt>
          <dd>
            {company.url ? (
              <a
                href={company.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline truncate block"
              >
                {company.url}
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>

          <dt className="text-muted-foreground">年収・待遇</dt>
          <dd>{company.salary ?? <span className="text-muted-foreground">—</span>}</dd>

          <dt className="text-muted-foreground">締切</dt>
          <dd
            className={
              isOverdue(company.deadline, false) ? "text-red-600 font-medium" : ""
            }
          >
            {company.deadline ? (
              formatDateFull(company.deadline)
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>
          <dt className="text-muted-foreground col-span-2">インターン情報</dt>
          <dd className="col-span-2 space-y-1">
            <p>
              <span className="text-muted-foreground">名称: </span>
              {company.internship_name ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">場所・URL: </span>
              {company.internship_location ?? "—"}
            </p>
            <p className="whitespace-pre-wrap">
              <span className="text-muted-foreground">メモ: </span>
              {company.internship_memo ?? "—"}
            </p>
          </dd>
        </dl>
      </Card>

      <section>
        <SectionHeader
          title="インターン・面接日程"
          action={
            <Button size="sm" onClick={() => setShowEvent(!showEvent)}>
              {showEvent ? "閉じる" : "+ 追加"}
            </Button>
          }
        />
        {showEvent && (
          <Card className="mb-3">
            <CompanyEventForm
              companyId={company.id}
              onSuccess={() => setShowEvent(false)}
              onCancel={() => setShowEvent(false)}
            />
          </Card>
        )}
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">日程がありません</p>
        ) : (
          <div className={`space-y-2 ${isPending ? "opacity-60" : ""}`}>
            {events.map((event) => (
              <Card key={event.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={getEventTypeColor(event.type)}>
                        {
                          COMPANY_EVENT_TYPE_LABELS[
                            event.type as CompanyEventType
                          ]
                        }
                      </Badge>
                      <p className="text-sm font-medium">{event.title}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDateFull(event.event_date)}
                      </span>
                    </div>
                    {event.memo && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-2">
                        {event.memo}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteEvent(event.id)}
                    disabled={isPending}
                  >
                    削除
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

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

function CompanyEventForm({
  companyId,
  onSuccess,
  onCancel,
}: {
  companyId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      company_id: companyId,
      type: form.get("type") as CompanyEventType,
      title: form.get("title") as string,
      event_date: form.get("event_date") as string,
      memo: (form.get("memo") as string) || null,
    };

    startTransition(async () => {
      try {
        await createCompanyEvent(data);
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <p className="text-sm text-red-600 bg-red-500/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="種類">
          <Select name="type" defaultValue="interview">
            {COMPANY_EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {COMPANY_EVENT_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="日程 *">
          <Input type="date" name="event_date" required />
        </Field>
      </div>
      <Field label="タイトル *">
        <Input
          name="title"
          required
          placeholder="例: 1次面接 / 1dayインターン"
        />
      </Field>
      <Field label="メモ">
        <Textarea
          name="memo"
          rows={2}
          placeholder="場所、URL、準備することなど"
        />
      </Field>
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中..." : "追加"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            キャンセル
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
      </label>
      {children}
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

function ImportantItem({
  label,
  value,
  subValue,
  alert,
  multiline,
}: {
  label: string;
  value: string;
  subValue?: string;
  alert?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p
        className={`text-base font-semibold ${
          alert ? "text-red-600" : "text-foreground"
        } ${multiline ? "whitespace-pre-wrap line-clamp-3" : "truncate"}`}
      >
        {value}
      </p>
      {subValue && (
        <p className="text-xs text-muted-foreground mt-1 truncate">{subValue}</p>
      )}
    </div>
  );
}

function getUpcomingEvent(events: CompanyEvent[]) {
  const today = new Date().toISOString().split("T")[0];
  return events.find((event) => event.event_date >= today) ?? events[0];
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
