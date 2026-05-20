"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createGeneralEvent, deleteGeneralEvent } from "@/lib/actions/general-events";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { formatDateFull } from "@/lib/utils";
import {
  GENERAL_EVENT_TYPES,
  GENERAL_EVENT_TYPE_LABELS,
  type GeneralEvent,
  type GeneralEventType,
} from "@/types";

export function GeneralEventsSection({ events }: { events: GeneralEvent[] }) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const upcoming = events.filter((e) => e.event_date >= new Date().toISOString().split("T")[0]);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-medium">一般予定</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            合同説明会・セミナーなど企業に紐づかない予定
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "閉じる" : "+ 追加"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-3">
          <GeneralEventForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
        </Card>
      )}

      <Card>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">予定なし</p>
        ) : (
          <ul className={`space-y-2 ${isPending ? "opacity-60" : ""}`}>
            {upcoming.slice(0, 8).map((event) => (
              <li
                key={event.id}
                className="flex items-start justify-between gap-3 text-sm py-1 border-b border-border last:border-0"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={getGeneralEventColor(event.type as GeneralEventType)}>
                      {GENERAL_EVENT_TYPE_LABELS[event.type as GeneralEventType]}
                    </Badge>
                    <span className="font-medium">{event.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateFull(event.event_date)}
                    {event.location && ` · ${event.location}`}
                  </p>
                  {event.memo && (
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                      {event.memo}
                    </p>
                  )}
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (confirm("この予定を削除しますか？")) {
                      startTransition(() => deleteGeneralEvent(event.id));
                    }
                  }}
                  disabled={isPending}
                >
                  削除
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Link href="/calendar" className="block text-xs text-muted-foreground hover:underline mt-3">
          カレンダーで見る →
        </Link>
      </Card>
    </section>
  );
}

function GeneralEventForm({
  onSuccess,
  onCancel,
}: {
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
      event_date: form.get("event_date") as string,
      location: (form.get("location") as string) || null,
      memo: (form.get("memo") as string) || null,
    };

    startTransition(async () => {
      try {
        await createGeneralEvent(data);
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
          <Select name="type" defaultValue="career_fair">
            {GENERAL_EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {GENERAL_EVENT_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="日程 *">
          <Input type="date" name="event_date" required />
        </Field>
      </div>
      <Field label="タイトル *">
        <Input name="title" required placeholder="例: 就活EXPO / IT業界合同説明会" />
      </Field>
      <Field label="場所・URL">
        <Input name="location" placeholder="オンライン / 東京ビッグサイト" />
      </Field>
      <Field label="メモ">
        <Textarea name="memo" rows={2} placeholder="持ち物、URL、準備することなど" />
      </Field>
      <div className="flex gap-2">
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
