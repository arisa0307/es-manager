"use client";

import { useState, useTransition } from "react";
import { purgeTrashedItem, restoreTrashedItem } from "@/lib/actions/trash";
import { trashKindLabel, type TrashItem } from "@/lib/trash-types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateFull } from "@/lib/utils";

export function TrashList({ items }: { items: TrashItem[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) {
    return <EmptyState title="ゴミ箱は空です" />;
  }

  const run = (fn: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "操作に失敗しました");
      }
    });
  };

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className={`space-y-2 ${isPending ? "opacity-60" : ""}`}>
        {items.map((item) => (
          <Card key={`${item.kind}-${item.id}`}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-muted text-muted-foreground">
                    {trashKindLabel(item.kind)}
                  </Badge>
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {item.company && <span>{item.company}</span>}
                  {item.date && <span>{formatDateFull(item.date)}</span>}
                  <span>削除: {formatDateFull(item.deletedAt.slice(0, 10))}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => run(() => restoreTrashedItem(item.kind, item.id))}
                  disabled={isPending}
                >
                  戻す
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (confirm("完全に削除しますか？この操作は元に戻せません。")) {
                      run(() => purgeTrashedItem(item.kind, item.id));
                    }
                  }}
                  disabled={isPending}
                >
                  完全に削除
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
