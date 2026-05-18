"use client";

import { useState, useTransition } from "react";
import { createCompany, updateCompany } from "@/lib/actions/companies";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  COMPANY_STATUSES,
  COMPANY_RESULTS,
  DESIRED_LEVELS,
  type Company,
  type CompanyStatus,
  type DesiredLevel,
} from "@/types";

export function CompanyForm({
  company,
  onSuccess,
  onCancel,
}: {
  company?: Company;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name") as string,
      industry: (form.get("industry") as string) || null,
      url: (form.get("url") as string) || null,
      desired_level: (form.get("desired_level") as DesiredLevel) || null,
      status: form.get("status") as CompanyStatus,
      result: (form.get("result") as string) || null,
      salary: (form.get("salary") as string) || null,
      next_action: (form.get("next_action") as string) || null,
      memo: (form.get("memo") as string) || null,
      internship_name: (form.get("internship_name") as string) || null,
      internship_location: (form.get("internship_location") as string) || null,
      internship_memo: (form.get("internship_memo") as string) || null,
      deadline: (form.get("deadline") as string) || null,
    };

    startTransition(async () => {
      try {
        if (company) await updateCompany(company.id, data);
        else await createCompany(data);
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <p className="text-sm text-red-600 bg-red-500/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Field label="企業名 *">
        <Input name="name" required defaultValue={company?.name} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="業界">
          <Input name="industry" defaultValue={company?.industry ?? ""} />
        </Field>
        <Field label="志望度">
          <Select name="desired_level" defaultValue={company?.desired_level ?? ""}>
            <option value="">—</option>
            {DESIRED_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="URL">
        <Input name="url" type="url" defaultValue={company?.url ?? ""} placeholder="https://" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="ステータス">
          <Select name="status" defaultValue={company?.status ?? "未エントリー"}>
            {COMPANY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="選考結果">
          <Select name="result" defaultValue={company?.result ?? ""}>
            {COMPANY_RESULTS.map((r) => (
              <option key={r} value={r}>
                {r || "—"}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="年収・待遇">
          <Input name="salary" defaultValue={company?.salary ?? ""} />
        </Field>
        <Field label="締切">
          <Input type="date" name="deadline" defaultValue={company?.deadline ?? ""} />
        </Field>
      </div>

      <Field label="次のアクション">
        <Textarea name="next_action" rows={2} defaultValue={company?.next_action ?? ""} />
      </Field>

      <Field label="企業メモ">
        <Textarea
          name="memo"
          rows={4}
          defaultValue={company?.memo ?? ""}
          placeholder="事業内容、気になった点、面談で聞きたいことなど"
        />
      </Field>

      <div className="rounded-lg border border-border p-3 space-y-3">
        <p className="text-sm font-medium text-foreground">インターン情報</p>
        <Field label="インターン名">
          <Input
            name="internship_name"
            defaultValue={company?.internship_name ?? ""}
            placeholder="例: Summer Internship"
          />
        </Field>
        <Field label="場所・URL">
          <Input
            name="internship_location"
            defaultValue={company?.internship_location ?? ""}
            placeholder="オンライン / 東京本社 / https://..."
          />
        </Field>
        <Field label="インターンメモ">
          <Textarea
            name="internship_memo"
            rows={3}
            defaultValue={company?.internship_memo ?? ""}
            placeholder="内容、準備すること、気になる点など"
          />
        </Field>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中..." : company ? "更新" : "追加"}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
