"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  deleteES,
  deleteESSubmission,
  getEsFileUrl,
} from "@/lib/actions/es";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ESForm } from "./ESForm";
import { ESSubmissionForm } from "./ESSubmissionForm";
import { countWords, formatDate, formatTags, getSelectionResultColor } from "@/lib/utils";
import type { Company, ESSubmissionWithDetails } from "@/types";

export function ESSubmissionCard({
  submission,
  companies,
  templates = [],
  showCompany = false,
}: {
  submission: ESSubmissionWithDetails;
  companies: Pick<Company, "id" | "name">[];
  templates?: {
    id: string;
    title: string;
    question: string;
    answer: string | null;
    word_count: number | null;
  }[];
  showCompany?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const questions = submission.es ?? [];

  const openFile = () => {
    if (!submission.file_path) return;
    startTransition(async () => {
      const url = await getEsFileUrl(submission.file_path!);
      if (url) window.open(url, "_blank", "noopener");
    });
  };

  if (editing) {
    return (
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <ESSubmissionForm
          companies={companies}
          submission={submission}
          defaultCompanyId={submission.company_id}
          onSuccess={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-border bg-card shadow-sm ${isPending ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        {submission.kind === "アンケート" && (
          <Badge className="bg-teal-500/10 text-teal-700 dark:text-teal-300">
            アンケート
          </Badge>
        )}
        <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
          {submission.phase}
        </Badge>
        {showCompany && submission.companies && (
          <Link
            href={`/companies/${submission.companies.id}`}
            className="text-sm font-medium hover:underline"
          >
            {submission.companies.name}
          </Link>
        )}
        {submission.title && (
          <span className="text-sm text-muted-foreground">{submission.title}</span>
        )}
        {submission.result && (
          <Badge className={getSelectionResultColor(submission.result)}>
            {submission.result}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {submission.submitted_on
            ? `提出 ${formatDate(submission.submitted_on)}`
            : ""}
        </span>
        <span className="text-xs text-muted-foreground">設問{questions.length}</span>

        <div className="ml-auto flex gap-1">
          {submission.file_path && (
            <Button variant="ghost" size="sm" onClick={openFile} disabled={isPending}>
              添付
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            編集
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (
                confirm(
                  `この提出（${submission.phase}${submission.title ? ` / ${submission.title}` : ""}）と設問${questions.length}件を削除しますか？`
                )
              )
                startTransition(() => deleteESSubmission(submission.id));
            }}
          >
            削除
          </Button>
        </div>
      </div>

      <div className="space-y-2 p-3">
        {submission.memo && (
          <p className="whitespace-pre-wrap text-xs text-muted-foreground">
            {submission.memo}
          </p>
        )}

        {questions.length === 0 && !addingQuestion && (
          <p className="py-1 text-sm text-muted-foreground">設問がありません</p>
        )}

        {questions.map((q) =>
          editingQuestionId === q.id ? (
            <div key={q.id} className="rounded-lg border border-border bg-muted/20 p-3">
              <ESForm
                companyId={submission.company_id}
                submissionId={submission.id}
                es={q}
                templates={templates}
                onSuccess={() => setEditingQuestionId(null)}
                onCancel={() => setEditingQuestionId(null)}
              />
            </div>
          ) : (
            <div
              key={q.id}
              className="rounded-lg border border-border bg-muted/20 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-medium">{q.question}</p>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  >
                    {expandedId === q.id ? "閉" : "開"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingQuestionId(q.id)}
                  >
                    編集
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (confirm("この設問を削除しますか？"))
                        startTransition(() => deleteES(q.id));
                    }}
                  >
                    削除
                  </Button>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {(() => {
                  const words = countWords(q.answer);
                  const over = q.word_count !== null && words > q.word_count;
                  return (
                    <Badge
                      className={
                        over
                          ? "bg-red-500/10 text-red-600"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {words}
                      {q.word_count !== null && ` / ${q.word_count}`} 文字
                    </Badge>
                  );
                })()}
                {q.tags && q.tags.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formatTags(q.tags)}
                  </span>
                )}
              </div>
              {expandedId === q.id && q.answer && (
                <p className="mt-2 whitespace-pre-wrap border-t border-border pt-2 text-sm text-muted-foreground">
                  {q.answer}
                </p>
              )}
            </div>
          )
        )}

        {addingQuestion ? (
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <ESForm
              companyId={submission.company_id}
              submissionId={submission.id}
              templates={templates}
              onSuccess={() => setAddingQuestion(false)}
              onCancel={() => setAddingQuestion(false)}
            />
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setAddingQuestion(true)}>
            + 設問を追加
          </Button>
        )}
      </div>
    </div>
  );
}
