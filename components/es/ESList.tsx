"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ESSubmissionForm } from "./ESSubmissionForm";
import { ESSubmissionCard } from "./ESSubmissionCard";
import type { Company, ESSubmissionWithDetails } from "@/types";

export function ESList({
  submissions,
  companies,
  templates = [],
}: {
  submissions: ESSubmissionWithDetails[];
  companies: Pick<Company, "id" | "name">[];
  templates?: {
    id: string;
    title: string;
    question: string;
    answer: string | null;
    word_count: number | null;
  }[];
}) {
  const [showForm, setShowForm] = useState(false);

  // 企業ごとにまとめて折りたたむ
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { name: string; items: ESSubmissionWithDetails[] }
    >();
    for (const s of submissions) {
      const key = s.companies?.id ?? "none";
      const name = s.companies?.name ?? "企業未設定";
      if (!map.has(key)) map.set(key, { name, items: [] });
      map.get(key)!.items.push(s);
    }
    return [...map.entries()]
      .map(([key, g]) => ({ key, ...g }))
      .sort((a, b) => {
        if (a.key === "none") return 1;
        if (b.key === "none") return -1;
        return a.name.localeCompare(b.name, "ja");
      });
  }, [submissions]);

  const [open, setOpen] = useState<Set<string>>(new Set());
  const isOpen = (key: string) => groups.length === 1 || open.has(key);
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (submissions.length === 0 && !showForm) {
    return (
      <EmptyState
        title="ES提出がまだありません"
        description="インターン用・本選考用など「ES提出」を作り、その中に設問を追加します"
        action={<Button onClick={() => setShowForm(true)}>ES提出を登録</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      {showForm && (
        <Card>
          <ESSubmissionForm
            companies={companies}
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        </Card>
      )}

      {!showForm && (
        <Button onClick={() => setShowForm(true)}>+ ES提出を登録</Button>
      )}

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.key}>
            <button
              type="button"
              onClick={() => toggle(group.key)}
              className="mb-2 flex w-full items-center gap-2 text-left"
            >
              <span
                className={`text-xs text-muted-foreground transition-transform ${isOpen(group.key) ? "rotate-90" : ""}`}
              >
                ▶
              </span>
              <span className="text-sm font-medium">{group.name}</span>
              <span className="text-xs text-muted-foreground">
                {group.items.length}提出
              </span>
            </button>
            {isOpen(group.key) && (
              <div className="space-y-3">
                {group.items.map((s) => (
                  <ESSubmissionCard
                    key={s.id}
                    submission={s}
                    companies={companies}
                    templates={templates}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
