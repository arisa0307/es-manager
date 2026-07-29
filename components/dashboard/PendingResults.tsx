import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import type { PendingResult } from "@/lib/actions/pending";

/**
 * 「結果待ち」の選考をまとめて表示する。結果が出たら各行から企業ページへ飛んで記録できる。
 */
export function PendingResults({ items }: { items: PendingResult[] }) {
  return (
    <Card>
      <div className="mb-3">
        <h2 className="text-sm font-medium text-foreground">
          結果待ちの選考
          {items.length > 0 && (
            <span className="ml-1.5 text-muted-foreground">{items.length}件</span>
          )}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          結果が出たらタップして「通過／不通過」に更新してください
        </p>
      </div>

      {items.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          結果待ちはありません。
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/20 px-3 py-2 transition-colors hover:bg-muted/40"
              >
                <Badge className="shrink-0 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  {item.label}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {item.company && (
                    <span className="font-medium text-foreground">
                      {item.company}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {item.company ? " ・ " : ""}
                    {item.title}
                  </span>
                </span>
                {item.date && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(item.date)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
