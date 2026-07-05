"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCompany } from "@/lib/actions/companies";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CompanyForm } from "./CompanyForm";
import { InlineCompanySelect } from "./InlineCompanySelect";
import { InlineCompanyText } from "./InlineCompanyText";
import {
  formatDate,
  getStatusColor,
  getLevelColor,
  isOverdue,
} from "@/lib/utils";
import { COMPANY_STATUSES, DESIRED_LEVELS } from "@/types";
import type { Company, CompanyStatus, DesiredLevel } from "@/types";

export function CompanyTable({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    startTransition(() => deleteCompany(id));
  };

  if (companies.length === 0 && !showForm) {
    return (
      <EmptyState
        title="企業がまだありません"
        description="最初の企業を追加して就活管理を始めましょう"
        action={<Button onClick={() => setShowForm(true)}>企業を追加</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      {(showForm || editing) && (
        <Card>
          <h3 className="text-sm font-medium mb-3">
            {editing ? "企業を編集" : "新しい企業"}
          </h3>
          <CompanyForm
            company={editing ?? undefined}
            onSuccess={(createdCompanyId) => {
              setShowForm(false);
              setEditing(null);
              if (createdCompanyId) {
                router.push(`/companies/${createdCompanyId}`);
                router.refresh();
                return;
              }
              router.refresh();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </Card>
      )}

      {!showForm && !editing && (
        <Button onClick={() => setShowForm(true)}>+ 企業を追加</Button>
      )}

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">企業名</th>
              <th className="px-3 py-2 font-medium">業界</th>
              <th className="px-3 py-2 font-medium">志望度</th>
              <th className="px-3 py-2 font-medium">ステータス</th>
              <th className="px-3 py-2 font-medium">締切</th>
              <th className="px-3 py-2 font-medium w-24"></th>
            </tr>
          </thead>
          <tbody className={isPending ? "opacity-60" : ""}>
            {companies.map((c) => (
              <tr
                key={c.id}
                className="border-b border-border last:border-0 hover:bg-muted/30"
              >
                <td className="px-3 py-2.5">
                  <Link
                    href={`/companies/${c.id}`}
                    prefetch={false}
                    className="block font-medium text-foreground hover:underline"
                  >
                    {c.name}
                  </Link>
                  <div className="mt-1">
                    <InlineCompanyText companyId={c.id} value={c.progress_note} />
                  </div>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {c.industry ?? "—"}
                </td>
                <td className="px-3 py-2.5">
                  <InlineCompanySelect
                    companyId={c.id}
                    field="desired_level"
                    value={c.desired_level}
                    options={DESIRED_LEVELS}
                    colorClass={getLevelColor(c.desired_level as DesiredLevel)}
                    allowEmpty
                  />
                </td>
                <td className="px-3 py-2.5">
                  <InlineCompanySelect
                    companyId={c.id}
                    field="status"
                    value={c.status}
                    options={COMPANY_STATUSES}
                    colorClass={getStatusColor(c.status as CompanyStatus)}
                  />
                </td>
                <td
                  className={`px-3 py-2.5 ${isOverdue(c.deadline, false) ? "text-red-600 font-medium" : "text-muted-foreground"}`}
                >
                  {formatDate(c.deadline)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
                      編集
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(c.id, c.name)}
                    >
                      削除
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className={`md:hidden space-y-2 ${isPending ? "opacity-60" : ""}`}>
        {companies.map((c) => (
          <Card key={c.id} hover>
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/companies/${c.id}`}
                prefetch={false}
                className="min-w-0 block"
              >
                <p className="font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.industry ?? "—"}
                </p>
              </Link>
              <InlineCompanySelect
                companyId={c.id}
                field="desired_level"
                value={c.desired_level}
                options={DESIRED_LEVELS}
                colorClass={getLevelColor(c.desired_level as DesiredLevel)}
                allowEmpty
              />
            </div>
            <div className="mt-2">
              <InlineCompanyText companyId={c.id} value={c.progress_note} />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <InlineCompanySelect
                companyId={c.id}
                field="status"
                value={c.status}
                options={COMPANY_STATUSES}
                colorClass={getStatusColor(c.status as CompanyStatus)}
              />
              <span
                className={`text-xs ${isOverdue(c.deadline, false) ? "text-red-600" : "text-muted-foreground"}`}
              >
                締切 {formatDate(c.deadline)}
              </span>
            </div>
            <div className="flex gap-1 mt-2 pt-2 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
                編集
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(c.id, c.name)}
              >
                削除
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
