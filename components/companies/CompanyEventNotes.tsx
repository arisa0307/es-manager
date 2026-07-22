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
 * その企業の説明会・インターンなどの「メモ・内容」だけを抜き出してまとめ読みする欄。
 * 予定・日程は日付管理が主目的なので、内容の振り返りはここに集約する。
 */
export function CompanyEventNotes({ events }: { events: CompanyEvent[] }) {
  const notes = events
    .filter((event) => event.memo && event.memo.trim())
    .sort((a, b) => {
      // 日付の新しい順。日程未定は末尾へ。
      if (!a.event_date && !b.event_date) return 0;
      if (!a.event_date) return 1;
      if (!b.event_date) return -1;
      return b.event_date.localeCompare(a.event_date);
    });

  return (
    <Card>
      <div className="mb-3">
        <h2 className="text-sm font-medium text-foreground">記録・メモ</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          説明会やインターンの内容など、予定に書いたメモをまとめて読めます
        </p>
      </div>

      {notes.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          メモはまだありません。「予定・日程」の各予定にある「メモ・内容」に書くと、ここにまとまります。
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-border bg-muted/20 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-muted text-muted-foreground">
                  {COMPANY_EVENT_TYPE_LABELS[event.type as CompanyEventType]}
                </Badge>
                <span className="text-sm font-medium">{event.title}</span>
                <span className="text-xs text-muted-foreground">
                  {event.event_date ? formatDate(event.event_date) : "日程未定"}
                </span>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                <LinkifiedText text={event.memo!} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
