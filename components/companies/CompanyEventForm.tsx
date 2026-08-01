"use client";

import { useRef, useState, useTransition } from "react";
import {
  checkCompanyEventConflicts,
  createCompanyEvent,
  updateCompanyEvent,
} from "@/lib/actions/company-events";
import {
  normalizeCandidateSlots,
} from "@/lib/company-event-utils";
import { parseEventTimeFromForm } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  SELECTION_RESULTS,
  INTERVIEW_ROUND_OPTIONS,
  COMPANY_EVENT_TYPES,
  COMPANY_EVENT_TYPE_LABELS,
  EVENT_SCHEDULE_STATUSES,
  EVENT_SCHEDULE_STATUS_LABELS,
  type CompanyEventCandidateSlot,
  type CompanyEvent,
  type CompanyEventType,
  type EventScheduleStatus,
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
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<
    Awaited<ReturnType<typeof checkCompanyEventConflicts>>
  >([]);
  const [scheduleStatus, setScheduleStatus] = useState<EventScheduleStatus>(
    event?.schedule_status ?? (event?.event_date ? "confirmed" : "undecided")
  );
  const [candidateSlots, setCandidateSlots] = useState<CompanyEventCandidateSlot[]>(
    normalizeCandidateSlots(event?.candidate_slots)
  );
  const [type, setType] = useState<CompanyEventType>(event?.type ?? "interview");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submitForm(e.currentTarget);
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onChange={() => {
        if (conflicts.length > 0) setConflicts([]);
      }}
      className="space-y-3"
    >
      {error && (
        <p className="text-sm text-red-600 bg-red-500/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="種類">
          <Select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as CompanyEventType)}
          >
            {COMPANY_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {COMPANY_EVENT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="状態">
          <Select
            name="schedule_status"
            value={scheduleStatus}
            onChange={(e) => setScheduleStatus(e.target.value as EventScheduleStatus)}
          >
            {EVENT_SCHEDULE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {EVENT_SCHEDULE_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="タイトル *">
        <Input
          name="title"
          required
          defaultValue={event?.title ?? ""}
          placeholder="例: 1次面接 / 1dayインターン"
        />
      </Field>
      {type === "interview" && (
        <Field label="面接ラウンド">
          <Select name="interview_round" defaultValue={event?.interview_round ?? ""}>
            <option value="">未設定</option>
            {INTERVIEW_ROUND_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {scheduleStatus === "undecided" ? (
        <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          日程未定として保存します。候補日があれば下で複数追加できます。
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <Field label="日程 *">
            <Input
              type="date"
              name="event_date"
              required
              defaultValue={event?.event_date ?? ""}
            />
          </Field>
          <Field label="開始">
            <Input
              type="time"
              name="event_time"
              defaultValue={event?.event_time ?? ""}
            />
          </Field>
          <Field label="終了">
            <Input
              type="time"
              name="event_end_time"
              defaultValue={event?.event_end_time ?? ""}
            />
          </Field>
        </div>
      )}
      <div className="space-y-2 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">候補日</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              複数登録できます。保存前に既存予定との重複も確認します
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setConflicts([]);
              setCandidateSlots((current) => [
                ...current,
                { date: "", start_time: null, end_time: null },
              ]);
            }}
          >
            + 候補日追加
          </Button>
        </div>
        {candidateSlots.length === 0 ? (
          <p className="text-xs text-muted-foreground">候補日はまだありません</p>
        ) : (
          <div className="space-y-2">
            {candidateSlots.map((slot, index) => (
              <div key={`${event?.id ?? "new"}-${index}`} className="grid grid-cols-[1.4fr_1fr_1fr_auto] gap-2">
                <Input
                  type="date"
                  value={slot.date}
                  onChange={(e) =>
                    updateCandidateSlot(index, "date", e.target.value)
                  }
                />
                <Input
                  type="time"
                  value={slot.start_time ?? ""}
                  onChange={(e) =>
                    updateCandidateSlot(index, "start_time", e.target.value)
                  }
                />
                <Input
                  type="time"
                  value={slot.end_time ?? ""}
                  onChange={(e) =>
                    updateCandidateSlot(index, "end_time", e.target.value)
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConflicts([]);
                    setCandidateSlots((current) =>
                      current.filter((_, currentIndex) => currentIndex !== index)
                    );
                  }}
                >
                  削除
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Field label="結果">
        <Select name="result" defaultValue={event?.result ?? ""}>
          {SELECTION_RESULTS.map((r) => (
            <option key={r} value={r}>
              {r || "—"}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="事前メモ（参加前に見る情報）">
        <Textarea
          name="memo"
          rows={2}
          defaultValue={event?.memo ?? ""}
          placeholder="URL、場所、服装、持ち物、準備することなど"
        />
      </Field>
      <Field label="参加後の記録（内容・振り返り）">
        <Textarea
          name="report"
          rows={5}
          defaultValue={event?.report ?? ""}
          placeholder="面接: 聞かれた質問・逆質問・手応え / GD: お題・役割・進め方 / 説明会・インターン: 内容・社風など。ここに書いた内容が「参加後の記録」欄にまとまります"
        />
      </Field>
      {conflicts.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
          <p className="font-medium">予定の重複候補があります</p>
          <ul className="mt-1 space-y-1 text-xs">
            {conflicts.map((conflict) => (
              <li key={conflict.key}>- {conflict.summary}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs">
            問題なければ「重複を確認して保存」でそのまま登録できます。
          </p>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中..." : event ? "更新" : "追加"}
        </Button>
        {conflicts.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => {
              if (formRef.current) void submitForm(formRef.current, true);
            }}
          >
            重複を確認して保存
          </Button>
        )}
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            キャンセル
          </Button>
        )}
      </div>
    </form>
  );

  function updateCandidateSlot(
    index: number,
    key: keyof CompanyEventCandidateSlot,
    value: string
  ) {
    setConflicts([]);
    setCandidateSlots((current) =>
      current.map((slot, currentIndex) =>
        currentIndex === index
          ? {
              ...slot,
              [key]:
                key === "date" ? value : value || null,
            }
          : slot
      )
    );
  }

  function submitForm(formElement: HTMLFormElement, allowConflicts = false) {
    const form = new FormData(formElement);
    const status =
      ((form.get("schedule_status") as EventScheduleStatus) || "confirmed");
    const payload = {
      type: form.get("type") as CompanyEventType,
      title: (form.get("title") as string)?.trim(),
      schedule_status: status,
      event_date:
        status === "undecided"
          ? null
          : ((form.get("event_date") as string)?.trim() || null),
      event_time:
        status === "undecided" ? null : parseEventTimeFromForm(form),
      event_end_time:
        status === "undecided"
          ? null
          : parseEventTimeFromForm(form, "event_end_time"),
      candidate_slots: candidateSlots.map((slot) => ({
        date: slot.date ?? "",
        start_time: slot.start_time ?? null,
        end_time: slot.end_time ?? null,
      })),
      memo: (form.get("memo") as string) || null,
      report: (form.get("report") as string) || null,
      result: (form.get("result") as string) || null,
      interview_round:
        (form.get("type") as string) === "interview"
          ? (form.get("interview_round") as string) || null
          : null,
    };

    startTransition(async () => {
      try {
        setError(null);

        if (!payload.title) {
          setError("タイトルを入力してください");
          return;
        }
        if (payload.schedule_status !== "undecided" && !payload.event_date) {
          setError("日程を入力するか、状態を「未定」にしてください");
          return;
        }
        if (!payload.event_time && payload.event_end_time) {
          setError("終了時刻を入れる場合は開始時刻も入力してください");
          return;
        }

        const cleanedPayload = {
          ...payload,
          candidate_slots: payload.candidate_slots.filter(
            (slot) => slot.date || slot.start_time || slot.end_time
          ),
        };

        if (
          cleanedPayload.candidate_slots.some(
            (slot) => !slot.date && (slot.start_time || slot.end_time)
          )
        ) {
          setError("候補日に時間を入れる場合は日付も入力してください");
          return;
        }
        if (
          cleanedPayload.candidate_slots.some(
            (slot) => !slot.start_time && slot.end_time
          )
        ) {
          setError("候補日の終了時刻を入れる場合は開始時刻も入力してください");
          return;
        }

        if (!allowConflicts) {
          const nextConflicts = await checkCompanyEventConflicts({
            id: event?.id,
            title: cleanedPayload.title,
            type: cleanedPayload.type,
            schedule_status: cleanedPayload.schedule_status,
            event_date: cleanedPayload.event_date,
            event_time: cleanedPayload.event_time,
            event_end_time: cleanedPayload.event_end_time,
            candidate_slots: cleanedPayload.candidate_slots,
          });

          if (nextConflicts.length > 0) {
            setConflicts(nextConflicts);
            return;
          }
        }

        setConflicts([]);
        if (event) {
          await updateCompanyEvent(event.id, cleanedPayload);
        } else {
          await createCompanyEvent({ company_id: companyId, ...cleanedPayload });
        }
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      }
    });
  }
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
