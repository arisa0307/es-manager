"use client";

import { useState, useTransition } from "react";
import { createTemplate, updateTemplate } from "@/lib/actions/templates";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { countWords, parseTags } from "@/lib/utils";
import type { ESTemplate } from "@/types";

export function TemplateForm({
  template,
  onSuccess,
  onCancel,
}: {
  template?: ESTemplate;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState(template?.answer ?? "");
  const [wordCount, setWordCount] = useState(template?.word_count?.toString() ?? "");
  const [tags, setTags] = useState(template?.tags?.join(", ") ?? "");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      title: form.get("title") as string,
      question: form.get("question") as string,
      answer: answer || null,
      word_count: wordCount ? parseInt(wordCount, 10) : null,
      tags: parseTags(tags),
    };

    startTransition(async () => {
      try {
        if (template) await updateTemplate(template.id, data);
        else await createTemplate(data);
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラー");
      }
    });
  };

  const words = countWords(answer);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-sm text-red-600 bg-red-500/10 px-3 py-2 rounded-md">{error}</p>}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">タイトル *</label>
        <Input name="title" required defaultValue={template?.title} />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">設問 *</label>
        <Textarea name="question" required defaultValue={template?.question} rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">文字数</label>
          <Input type="number" value={wordCount} onChange={(e) => setWordCount(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">タグ</label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="カンマ区切り" />
        </div>
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <label className="text-xs text-muted-foreground">回答テンプレ</label>
          <span className="text-xs text-muted-foreground">{words} 文字</span>
        </div>
        <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={8} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>{isPending ? "保存中..." : template ? "更新" : "作成"}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>キャンセル</Button>}
      </div>
    </form>
  );
}
