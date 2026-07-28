"use client";

import { useState, useTransition } from "react";
import { createES, updateES } from "@/lib/actions/es";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { countWords, parseTags } from "@/lib/utils";
import type { ES } from "@/types";

/**
 * ES提出にぶら下がる「設問」1件のフォーム。
 * 通過可否は提出単位で持つため、ここには結果欄は無い。
 */
export function ESForm({
  companyId,
  submissionId,
  es,
  templates = [],
  onSuccess,
  onCancel,
}: {
  companyId: string;
  submissionId: string;
  es?: ES;
  templates?: {
    id: string;
    title: string;
    question: string;
    answer: string | null;
    word_count: number | null;
  }[];
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState(es?.question ?? "");
  const [answer, setAnswer] = useState(es?.answer ?? "");
  const [wordCount, setWordCount] = useState(es?.word_count?.toString() ?? "");
  const [tags, setTags] = useState(es?.tags?.join(", ") ?? "");
  const [baseEs, setBaseEs] = useState(es?.base_es ?? "");

  const applyTemplate = (templateId: string) => {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    setQuestion(t.question);
    setAnswer(t.answer ?? "");
    setWordCount(t.word_count?.toString() ?? "");
    setBaseEs(t.title);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = {
      question,
      answer: answer || null,
      word_count: wordCount ? parseInt(wordCount, 10) : null,
      tags: parseTags(tags),
      base_es: baseEs || null,
    };
    startTransition(async () => {
      try {
        if (es) {
          await updateES(es.id, data);
        } else {
          await createES({ company_id: companyId, submission_id: submissionId, ...data });
        }
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      }
    });
  };

  const words = countWords(answer);
  const limit = wordCount ? parseInt(wordCount, 10) : null;
  const isOver = limit !== null && words > limit;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <p className="text-sm text-red-600 bg-red-500/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {!es && templates.length > 0 && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            テンプレから挿入
          </label>
          <Select onChange={(e) => e.target.value && applyTemplate(e.target.value)}>
            <option value="">選択...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <label className="block text-xs text-muted-foreground mb-1">設問 *</label>
        <Textarea
          required
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">文字数制限</label>
          <Input
            type="number"
            min={1}
            value={wordCount}
            onChange={(e) => setWordCount(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">タグ</label>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="カンマ区切り"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">ベースES</label>
        <Input
          value={baseEs}
          onChange={(e) => setBaseEs(e.target.value)}
          placeholder="テンプレ名など"
        />
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <label className="text-xs text-muted-foreground">回答</label>
          <span
            className={`text-xs ${isOver ? "text-red-600 font-medium" : "text-muted-foreground"}`}
          >
            {words}
            {limit !== null && ` / ${limit}`} 文字
          </span>
        </div>
        <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={8} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中..." : es ? "更新" : "設問を追加"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            キャンセル
          </Button>
        )}
      </div>
    </form>
  );
}
