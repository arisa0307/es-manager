"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { COMPANY_STATUSES, DESIRED_LEVELS } from "@/types";

export function CompanyFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      startTransition(() => {
        router.push(`/companies?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-4 ${isPending ? "opacity-60" : ""}`}
    >
      <Input
        placeholder="企業名・業界で検索"
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => update({ q: e.target.value })}
        className="sm:col-span-2"
      />
      <Select
        value={searchParams.get("status") ?? ""}
        onChange={(e) => update({ status: e.target.value })}
      >
        <option value="">ステータス</option>
        {COMPANY_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      <Select
        value={searchParams.get("level") ?? ""}
        onChange={(e) => update({ level: e.target.value })}
      >
        <option value="">志望度</option>
        {DESIRED_LEVELS.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </Select>
      <Select
        value={searchParams.get("sort") ?? "updated_at"}
        onChange={(e) => update({ sort: e.target.value })}
      >
        <option value="updated_at">更新日</option>
        <option value="name">企業名</option>
        <option value="deadline">締切</option>
        <option value="desired_level">志望度</option>
        <option value="status">ステータス</option>
      </Select>
    </div>
  );
}
