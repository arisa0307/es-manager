"use client";

import { useState, useTransition } from "react";
import {
  createGeneralEvent,
  deleteGeneralEvent,
  updateGeneralEvent,
} from "@/lib/actions/general-events";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { OptionalDateField } from "@/components/ui/OptionalDateField";
import { Select } from "@/components/ui/Select";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import { Textarea } from "@/components/ui/Textarea";
import {
  formatEventDateTime,
  parseEventEndTimeFromForm,
  parseEventTimeFromForm,
  parseOptionalDateFromForm,
} from "@/lib/utils";
import {
  GENERAL_EVENT_TYPES,
  GENERAL_EVENT_TYPE_LABELS,
  type GeneralEvent,
  type GeneralEventType,
} from "@/types";

export function GeneralEventsSection({
  events,
  today,
}: {
  events: GeneralEvent[];
  today: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const undated = events.filter((e) => !e.event_date);
  const dated = events.filter((e) => e.event_date);
  const upcoming = dated
    .filter((e) => e.event_date! >= today)
    .sort((a, b) => a.event_date!.localeCompare(b.event_date!));
  const past = dated
    .filter((e) => e.event_date! < today)
    .sort((a, b) => b.event_date!.localeCompare(a.event_date!));

  const hasAny = undated.length + upcoming.length + past.length > 0;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-medium">一般予定</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            期日なしは削除するまで残ります。過去の予定は必要なときだけ開けます
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "閉じる" : "+ 追加"}
        </Button>
      </div>

      {showForm && !editingEventId && (
        <Card className="mb-3">
          <GeneralEventForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
        </Card>
      )}

      <Card>
        {!hasAny ? (
          <p className="text-sm text-muted-foreground text-center py-2">予定なし</p>
        ) : (
          <div className={`space-y-4 ${isPending ? "opacity-60" : ""}`}>
            {undated.length > 0 && (
              <EventGroup title="期日なし">
                {undated.map((event) => (
                  <GeneralEventItem
                    key={event.id}
                    event={event}
                    editingEventId={editingEventId}
                    isPending={isPending}
                    onEdit={() => {
                      setShowForm(false);
                      setEditingEventId(event.id);
                    }}
                    onDelete={() => confirmDelete(event.id, startTransition)}
                    onEditSuccess={() => setEditingEventId(null)}
                    onEditCancel={() => setEditingEventId(null)}
                  />
                ))}
              </EventGroup>
            )}
            {upcoming.length > 0 && (
              <EventGroup title="これから">
                {upcoming.map((event) => (
                  <GeneralEventItem
                    key={event.id}
                    event={event}
                    editingEventId={editingEventId}
                    isPending={isPending}
                    onEdit={() => {
                      setShowForm(false);
                      setEditingEventId(event.id);
                    }}
                    onDelete={() => confirmDelete(event.id, startTransition)}
                    onEditSuccess={() => setEditingEventId(null)}
                    onEditCancel={() => setEditingEventId(null)}
                  />
                ))}
              </EventGroup>
            )}
            {past.length > 0 && (
              <div className="pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowPast(!showPast)}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                >
                  {showPast ? "過去の予定を隠す" : `過去の予定を表示（${past.length}件）`}
                </button>
                {showPast && (
                  <ul className="space-y-2 mt-2">
                    {past.map((event) => (
                      <GeneralEventItem
                        key={event.id}
                        event={event}
                        editingEventId={editingEventId}
                        isPending={isPending}
                        muted
                        onEdit={() => {
                          setShowForm(false);
                          setEditingEventId(event.id);
                        }}
                        onDelete={() => confirmDelete(event.id, startTransition)}
                        onEditSuccess={() => setEditingEventId(null)}
                        onEditCancel={() => setEditingEventId(null)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </section>
  );
}

function EventGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground mb-2">{title}</h3>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function confirmDelete(
  id: string,
  startTransition: ReturnType<typeof useTransition>[1]
) {
  if (confirm("この予定を削除しますか？\n（削除は取り消せません）")) {
    startTransition(() => deleteGeneralEvent(id));
  }
}

function GeneralEventItem({
  event,
  editingEventId,
  isPending,
  muted,
  onEdit,
  onDelete,
  onEditSuccess,
  onEditCancel,
}: {
  event: GeneralEvent;
  editingEventId: string | null;
  isPending: boolean;
  muted?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onEditSuccess: () => void;
  onEditCancel: () => void;
}) {
  return (
    <li className={`text-sm py-2 border-b border-border last:border-0 ${muted ? "opacity-80" : ""}`}>
      {editingEventId === event.id ? (
        <GeneralEventForm event={event} onSuccess={onEditSuccess} onCancel={onEditCancel} />
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getGeneralEventColor(event.type as GeneralEventType)}>
                {GENERAL_EVENT_TYPE_LABELS[event.type as GeneralEventType]}
              </Badge>
              <span className="font-medium">{event.title}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatEventDateTime(
                event.event_date,
                event.event_time,
                event.event_end_time
              )}
            </p>
            {event.location && (
              <p className="text-xs text-muted-foreground mt-1">
                <LinkifiedText text={event.location} />
              </p>
            )}
            {event.memo && (
              <p className="text-xs text-muted-foreground mt-1">
                <LinkifiedText text={event.memo} />
              </p>
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
    </li>
  );
}

function GeneralEventForm({
  event,
  onSuccess,
  onCancel,
}: {
  event?: GeneralEvent;
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
      type: form.get("type") as GeneralEventType,
      event_date: parseOptionalDateFromForm(form),
      event_time: parseEventTimeFromForm(form),
      event_end_time: parseEventEndTimeFromForm(form),
      location: (form.get("location") as string) || null,
      memo: (form.get("memo") as string) || null,
    };

    startTransition(async () => {
      try {
        if (event) await updateGeneralEvent(event.id, data);
        else await createGeneralEvent(data);
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="種類">
          <Select name="type" defaultValue={event?.type ?? "career_fair"}>
            {GENERAL_EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {GENERAL_EVENT_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="日程">
          <OptionalDateField name="event_date" defaultValue={event?.event_date} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="開始時間">
          <Input type="time" name="event_time" defaultValue={event?.event_time ?? ""} />
        </Field>
        <Field label="終了時間">
          <Input
            type="time"
            name="event_end_time"
            defaultValue={event?.event_end_time ?? ""}
          />
        </Field>
      </div>
      <Field label="タイトル *">
        <Input
          name="title"
          required
          defaultValue={event?.title ?? ""}
          placeholder="例: 就活EXPO / IT業界合同説明会"
        />
      </Field>
      <Field label="場所・URL">
        <Input
          name="location"
          defaultValue={event?.location ?? ""}
          placeholder="オンライン / 東京ビッグサイト"
        />
      </Field>
      <Field label="メモ">
        <Textarea
          name="memo"
          rows={2}
          defaultValue={event?.memo ?? ""}
          placeholder="持ち物、URL、準備することなど"
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中..." : event ? "更新" : "追加"}
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
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

function getGeneralEventColor(type: GeneralEventType): string {
  switch (type) {
    case "career_fair":
      return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "seminar":
      return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
    case "other":
      return "bg-muted text-muted-foreground";
  }
}
