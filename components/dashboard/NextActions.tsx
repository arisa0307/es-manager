"use client";

import { useState, useTransition } from "react";
import { getAiNextActions } from "@/lib/actions/recommendations";
import type { AiNextAction } from "@/lib/ai/gemini";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { RuleRecommendation } from "@/lib/recommendations";

export function NextActions({
  rules,
  aiEnabled,
}: {
  rules: RuleRecommendation[];
  aiEnabled: boolean;
}) {
  const [aiActions, setAiActions] = useState<AiNextAction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const runAi = () => {
    setError(null);
    startTransition(async () => {
      const res = await getAiNextActions();
      if (res.ok) setAiActions(res.actions);
      else setError(res.error);
    });
  };

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">今日の推奨アクション</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            締切・進捗から自動抽出。AIで優先順位を整理することもできます
          </p>
        </div>
        {aiEnabled && (
          <Button
            variant="secondary"
            size="sm"
            onClick={runAi}
            disabled={isPending}
            className="shrink-0"
          >
            {isPending ? "整理中..." : aiActions ? "再生成" : "AIで整理"}
          </Button>
        )}
      </div>

      {error && (
        <p className="mb-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      {aiActions ? (
        aiActions.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            今すぐ必要な大きなアクションはなさそうです。
          </p>
        ) : (
          <ol className="space-y-2">
            {aiActions.map((a, i) => (
              <li
                key={i}
                className="flex gap-2.5 rounded-lg border border-border bg-muted/20 px-3 py-2"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-medium text-accent">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{a.action}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.company && (
                      <span className="mr-1.5 font-medium">{a.company}</span>
                    )}
                    {a.reason}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )
      ) : rules.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          直近で締切・未設定の項目はありません。
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-sm">
              <Badge
                className={
                  r.urgency < 0
                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                    : r.urgency <= 3
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      : "bg-muted text-muted-foreground"
                }
              >
                {r.urgency < 0 ? "超過" : r.urgency <= 3 ? "間近" : "確認"}
              </Badge>
              <span className="min-w-0">{r.text}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
