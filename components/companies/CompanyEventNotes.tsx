"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import { formatDate } from "@/lib/utils";
import {
  COMPANY_EVENT_TYPE_LABELS,
  type CompanyEvent,
  type CompanyEventType,
} from "@/types";

/**
 * その企業の説明会・インターンなどの「参加後の記録」だけを抜き出してまとめ読みする欄。
 * 事前メモ(URL・服装など)は対象外にして、内容の振り返りに集中できるようにする。
 * 記録は長くなりがちなので、1件ずつ折りたためるようにする。
 */
export function CompanyEventNotes({ events }: { events: CompanyEvent[] }) {
  const notes = events
    .filter((event) => event.report && event.report.trim())
    .sort((a, b) => {
      // 日付の新しい順。日程未定は末尾へ。
      if (!a.event_date && !b.event_date) return 0;
      if (!a.event_date) return 1;
      if (!b.event_date) return -1;
      return b.event_date.localeCompare(a.event_date);
    });

  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Card>
      <div className="mb-3">
        <h2 className="text-sm font-medium text-foreground">参加後の記録</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          面接・GD・説明会・インターンの内容をまとめています（事前メモは除く）
        </p>
      </div>

      {notes.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          記録はまだありません。「予定・日程」の各予定にある「参加後の記録」に書くと、ここにまとまります。
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((event) => {
            const open = openIds.has(event.id);
            return (
              <div
                key={event.id}
                className="rounded-lg border border-border bg-muted/20"
              >
                <button
                  type="button"
                  onClick={() => toggle(event.id)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                >
                  <span
                    className={`shrink-0 text-xs text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
                  >
                    ▶
                  </span>
                  <Badge className="shrink-0 bg-muted text-muted-foreground">
                    {COMPANY_EVENT_TYPE_LABELS[event.type as CompanyEventType]}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {event.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {event.event_date ? formatDate(event.event_date) : "日程未定"}
                  </span>
                </button>
                {open && (
                  <div className="whitespace-pre-wrap border-t border-border px-3 py-2.5 text-sm text-foreground">
                    <LinkifiedText text={event.report!} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
