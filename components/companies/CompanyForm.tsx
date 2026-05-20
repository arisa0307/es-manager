"use client";

import { useState, useTransition } from "react";
import { createCompany, updateCompany } from "@/lib/actions/companies";
import { createCompanyEvent } from "@/lib/actions/company-events";
import { Button } from "@/components/ui/Button";
import {
  CompanyFormFields,
  parseCompanyFormData,
  parseOptionalEventFormData,
} from "./CompanyFormFields";
import type { Company } from "@/types";

export function CompanyForm({
  company,
  onSuccess,
  onCancel,
}: {
  company?: Company;
  /** 新規作成時は作成した企業 ID を渡す */
  onSuccess?: (createdCompanyId?: string) => void;
  onCancel?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = parseCompanyFormData(form);
    const optionalEvent = !company ? parseOptionalEventFormData(form) : null;

    startTransition(async () => {
      try {
        if (company) {
          await updateCompany(company.id, data);
          onSuccess?.();
        } else {
          const created = await createCompany(data);
          if (optionalEvent) {
            await createCompanyEvent({
              company_id: created.id,
              ...optionalEvent,
            });
          }
          onSuccess?.(created.id);
        }
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

      <CompanyFormFields company={company} showOptionalEvent={!company} />

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
