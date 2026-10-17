"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { updateCompany } from "@/lib/actions/companies";
import { cn } from "@/lib/utils";
import type { CompanyStatus, CompanyUpdate, DesiredLevel } from "@/types";

type Props = {
  companyId: string;
  field: "desired_level" | "status";
  value: string | null;
  options: readonly string[];
  colorClass: string;
  /** 空（未設定）を選べるようにする。志望度のみ true。 */
  allowEmpty?: boolean;
  emptyLabel?: string;
};

/**
 * 一覧上で志望度・ステータスをその場で変更するためのセレクト。
 * バッジ風の見た目を保ちつつ、変更時に該当企業の1フィールドだけ更新する。
 */
export function InlineCompanySelect({
  companyId,
  field,
  value,
  options,
  colorClass,
  allowEmpty,
  emptyLabel = "未設定",
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // 選択を即座に反映(サーバ往復を待たせない)。再検証後に props で同期される。
  const [optimisticValue, setOptimisticValue] = useOptimistic(value);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value;
    const next = raw === "" ? null : raw;
    if (next === value) return;
    const patch: CompanyUpdate =
      field === "status"
        ? { status: next as CompanyStatus }
        : { desired_level: next as DesiredLevel | null };
    startTransition(async () => {
      setOptimisticValue(next);
      await updateCompany(companyId, patch);
      router.refresh();
    });
  };

  return (
    <span className="relative inline-flex items-center">
      <select
        value={optimisticValue ?? ""}
        onChange={handleChange}
        aria-label={field === "status" ? "ステータスを変更" : "志望度を変更"}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "appearance-none cursor-pointer rounded-md border border-transparent py-0.5 pl-2 pr-5 text-xs font-medium transition-colors hover:border-border focus:outline-none focus:ring-1 focus:ring-accent",
          optimisticValue ? colorClass : "bg-muted text-muted-foreground"
        )}
      >
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-1.5 text-[8px] opacity-60">
        ▾
      </span>
    </span>
  );
}
