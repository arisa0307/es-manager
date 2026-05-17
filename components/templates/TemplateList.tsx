"use client";

import { useState, useTransition } from "react";
import { deleteTemplate } from "@/lib/actions/templates";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TemplateForm } from "./TemplateForm";
import { countWords, formatTags } from "@/lib/utils";
import type { ESTemplate } from "@/types";

export function TemplateList({ templates }: { templates: ESTemplate[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ESTemplate | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (templates.length === 0 && !showForm) {
    return (
      <EmptyState
        title="テンプレがありません"
        description="よく使うESをテンプレートとして保存できます"
        action={<Button onClick={() => setShowForm(true)}>テンプレ作成</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      {(showForm || editing) && (
        <Card>
          <TemplateForm
            template={editing ?? undefined}
            onSuccess={() => { setShowForm(false); setEditing(null); }}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </Card>
      )}
      {!showForm && !editing && <Button onClick={() => setShowForm(true)}>+ テンプレ作成</Button>}
      <div className={`space-y-2 ${isPending ? "opacity-60" : ""}`}>
        {templates.map((t) => (
          <Card key={t.id}>
            <div className="flex justify-between gap-2">
              <div>
                <p className="font-medium">{t.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{t.question}</p>
                {t.tags && t.tags.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">{formatTags(t.tags)}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {countWords(t.answer)} 文字
                  {t.word_count !== null && ` / ${t.word_count}`}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                  {expanded === t.id ? "閉" : "開"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(t)}>編集</Button>
                <Button variant="danger" size="sm" onClick={() => { if (confirm("削除？")) startTransition(() => deleteTemplate(t.id)); }}>削除</Button>
              </div>
            </div>
            {expanded === t.id && t.answer && (
              <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap border-t border-border pt-3">{t.answer}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
