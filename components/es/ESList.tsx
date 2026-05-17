"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();

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

      <div className={`space-y-2 ${isPending ? "opacity-60" : ""}`}>
        {items.map((item) => {
          const words = countWords(item.answer);
          const over = item.word_count !== null && words > item.word_count;
          return (
            <Card key={item.id}>
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  {item.companies && (
                    <Link
                      href={`/companies/${item.companies.id}`}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      {item.companies.name}
                    </Link>
                  )}
                  <p className="font-medium text-sm mt-0.5">{item.question}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <Badge className={over ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground"}>
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
                  <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                    {expanded === item.id ? "閉" : "開"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(item)}>
                    編集
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (confirm("削除しますか？")) startTransition(() => deleteES(item.id));
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
            </Card>
          );
        })}
      </div>
    </div>
  );
}
