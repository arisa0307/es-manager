"use client";

import { useState, useTransition } from "react";
import {
  createCompanyEvent,
  updateCompanyEvent,
} from "@/lib/actions/company-events";
import { parseEventTimeFromForm } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  COMPANY_EVENT_TYPES,
  COMPANY_EVENT_TYPE_LABELS,
  type CompanyEvent,
  type CompanyEventType,
} from "@/types";

export function CompanyEventForm({
  companyId,
  event,
  onSuccess,
  onCancel,
}: {
  companyId: string;
  event?: CompanyEvent;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      type: form.get("type") as CompanyEventType,
      title: form.get("title") as string,
      event_date: form.get("event_date") as string,
      event_time: parseEventTimeFromForm(form),
      memo: (form.get("memo") as string) || null,
    };

    startTransition(async () => {
      try {
        if (event) {
          await updateCompanyEvent(event.id, payload);
        } else {
          await createCompanyEvent({ company_id: companyId, ...payload });
        }
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
          <Select name="type" defaultValue={event?.type ?? "interview"}>
            {COMPANY_EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {COMPANY_EVENT_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="日程 *">
          <Input
            type="date"
            name="event_date"
            required
            defaultValue={event?.event_date ?? ""}
          />
        </Field>
      </div>
      <Field label="開催時間">
        <Input
          type="time"
          name="event_time"
          defaultValue={event?.event_time ?? ""}
        />
      </Field>
      <Field label="タイトル *">
        <Input
          name="title"
          required
          defaultValue={event?.title ?? ""}
          placeholder="例: 1次面接 / 1dayインターン"
        />
      </Field>
      <Field label="メモ">
        <Textarea
          name="memo"
          rows={2}
          defaultValue={event?.memo ?? ""}
          placeholder="場所、URL、準備することなど"
        />
      </Field>
      <div className="flex gap-2 pt-1">
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
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
