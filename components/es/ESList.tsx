"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { deleteES } from "@/lib/actions/es";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ESForm } from "./ESForm";
import { countWords, formatTags } from "@/lib/utils";
import type { Company, ESWithCompany } from "@/types";

export function ESList({
  items,
  companies,
  templates = [],
}: {
  items: ESWithCompany[];
  companies: Pick<Company, "id" | "name">[];
  templates?: { id: string; title: string; question: string; answer: string | null; word_count: number | null }[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ESWithCompany | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [openCompanies, setOpenCompanies] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  // 全件フラット表示だと見にくいため、企業ごとにまとめて折りたたむ
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; items: ESWithCompany[] }>();
    for (const item of items) {
      const key = item.companies?.id ?? "none";
      const name = item.companies?.name ?? "企業未設定";
      if (!map.has(key)) map.set(key, { name, items: [] });
      map.get(key)!.items.push(item);
    }
    return [...map.entries()]
      .map(([key, group]) => ({ key, ...group }))
      .sort((a, b) => {
        if (a.key === "none") return 1;
        if (b.key === "none") return -1;
        return a.name.localeCompare(b.name, "ja");
      });
  }, [items]);

  // グループが1つだけなら畳む意味がないので開いておく
  const isOpen = (key: string) => groups.length === 1 || openCompanies.has(key);

  const toggleCompany = (key: string) => {
    setOpenCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (items.length === 0 && !showForm) {
    return (
      <EmptyState
        title="ESがまだありません"
        action={<Button onClick={() => setShowForm(true)}>ESを登録</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      {(showForm || editing) && (
        <Card>
          <ESForm
            companies={companies}
            es={editing ?? undefined}
            templates={templates}
            onSuccess={() => {
              setShowForm(false);
              setEditing(null);
            }}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </Card>
      )}

      {!showForm && !editing && (
        <Button onClick={() => setShowForm(true)}>+ ESを登録</Button>
      )}

      <div className={`space-y-3 ${isPending ? "opacity-60" : ""}`}>
        {groups.map((group) => (
          <div
            key={group.key}
            className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleCompany(group.key)}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/40"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className={`text-xs text-muted-foreground transition-transform ${isOpen(group.key) ? "rotate-90" : ""}`}
                >
                  ▶
                </span>
                <span className="truncate text-sm font-medium">{group.name}</span>
                <Badge className="bg-muted text-muted-foreground shrink-0">
                  {group.items.length}件
                </Badge>
              </span>
              {group.key !== "none" && (
                <Link
                  href={`/companies/${group.key}`}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 text-xs text-muted-foreground hover:underline"
                >
                  企業ページ →
                </Link>
              )}
            </button>

            {isOpen(group.key) && (
              <div className="space-y-2 border-t border-border p-3">
                {group.items.map((item) => {
                  const words = countWords(item.answer);
                  const over = item.word_count !== null && words > item.word_count;
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-border bg-muted/20 px-3 py-2.5"
                    >
                      <div className="flex justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{item.question}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <Badge
                              className={
                                over
                                  ? "bg-red-500/10 text-red-600"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              {words}
                              {item.word_count !== null && ` / ${item.word_count}`}
                            </Badge>
                            {item.tags && item.tags.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {formatTags(item.tags)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setExpanded(expanded === item.id ? null : item.id)
                            }
                          >
                            {expanded === item.id ? "閉" : "開"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(item)}
                          >
                            編集
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              if (confirm("削除しますか？"))
                                startTransition(() => deleteES(item.id));
                            }}
                          >
                            削除
                          </Button>
                        </div>
                      </div>
                      {expanded === item.id && item.answer && (
                        <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap border-t border-border pt-3">
                          {item.answer}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
