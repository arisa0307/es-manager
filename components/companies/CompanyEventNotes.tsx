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

  return (
    <Card>
      <div className="mb-3">
        <h2 className="text-sm font-medium text-foreground">参加後の記録</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          説明会やインターンで聞いた内容だけをまとめています（事前メモは除く）
        </p>
      </div>

      {notes.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          記録はまだありません。「予定・日程」の各予定にある「参加後の記録」に書くと、ここにまとまります。
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
                <LinkifiedText text={event.report!} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
