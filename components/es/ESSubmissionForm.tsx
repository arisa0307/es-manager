"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { createESSubmission, updateESSubmission } from "@/lib/actions/es";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { OptionalDateField } from "@/components/ui/OptionalDateField";
import {
  ES_PHASES,
  ES_SUBMISSION_KINDS,
  SELECTION_RESULTS,
  type Company,
  type ESSubmission,
  type EsSubmissionKind,
} from "@/types";

const ES_BUCKET = "es-files";

export function ESSubmissionForm({
  companies,
  submission,
  defaultCompanyId,
  onSuccess,
  onCancel,
}: {
  companies: Pick<Company, "id" | "name">[];
  submission?: ESSubmission;
  defaultCompanyId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [kind, setKind] = useState<EsSubmissionKind>(submission?.kind ?? "ES");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const companyId =
      submission?.company_id ||
      (form.get("company_id") as string) ||
      defaultCompanyId ||
      "";
    if (!companyId) {
      setError("企業を選択してください");
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        let file_path = submission?.file_path ?? null;
        let file_name = submission?.file_name ?? null;

        if (file) {
          setUploading(true);
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("ログインが必要です");
          const ext = file.name.includes(".")
            ? file.name.split(".").pop()
            : "";
          const key = `${user.id}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
          const { error: upErr } = await supabase.storage
            .from(ES_BUCKET)
            .upload(key, file, { upsert: false });
          setUploading(false);
          if (upErr) throw new Error(`ファイルのアップロードに失敗: ${upErr.message}`);
          file_path = key;
          file_name = file.name;
        }

        const payload = {
          kind,
          phase: form.get("phase") as (typeof ES_PHASES)[number],
          title: (form.get("title") as string) || null,
          // アンケートは通過/不通過の概念がないので結果は持たせない
          result: kind === "アンケート" ? null : (form.get("result") as string) || null,
          submitted_on: (form.get("submitted_on") as string) || null,
          memo: (form.get("memo") as string) || null,
          file_path,
          file_name,
        };

        if (submission) {
          await updateESSubmission(submission.id, payload);
        } else {
          await createESSubmission({ company_id: companyId, ...payload });
        }
        onSuccess?.();
      } catch (err) {
        setUploading(false);
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {!submission && !defaultCompanyId && (
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">企業 *</label>
          <Select name="company_id" required defaultValue="">
            <option value="" disabled>
              選択
            </option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">種類</label>
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as EsSubmissionKind)}
          >
            {ES_SUBMISSION_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            {kind === "アンケート" ? "時期" : "選考種別"}
          </label>
          <Select name="phase" defaultValue={submission?.phase ?? "本選考"}>
            {ES_PHASES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {kind !== "アンケート" && (
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">選考結果</label>
          <Select name="result" defaultValue={submission?.result ?? ""}>
            {SELECTION_RESULTS.map((r) => (
              <option key={r} value={r}>
                {r || "—"}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">タイトル</label>
          <Input
            name="title"
            defaultValue={submission?.title ?? ""}
            placeholder="例: サマーインターンES"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">提出日</label>
          <OptionalDateField
            name="submitted_on"
            defaultValue={submission?.submitted_on ?? null}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          添付ファイル（PDF等）
        </label>
        {submission?.file_name && !file && (
          <p className="mb-1 text-xs text-muted-foreground">
            現在: {submission.file_name}（新しく選ぶと差し替え）
          </p>
        )}
        <input
          type="file"
          accept=".pdf,.doc,.docx,image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-sm file:text-foreground"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">メモ</label>
        <Textarea name="memo" rows={2} defaultValue={submission?.memo ?? ""} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {uploading
            ? "アップロード中..."
            : isPending
              ? "保存中..."
              : submission
                ? "更新"
                : kind === "アンケート"
                  ? "アンケートを登録"
                  : "ES提出を登録"}
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
