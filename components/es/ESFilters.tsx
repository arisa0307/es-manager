"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useDebouncedCallback } from "@/lib/use-debounced-callback";
import type { Company } from "@/types";

export function ESFilters({
  companies,
}: {
  companies: Pick<Company, "id" | "name">[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      startTransition(() => router.push(`/es?${params.toString()}`));
    },
    [router, searchParams]
  );

  const debouncedSearch = useDebouncedCallback(
    (value: string) => update("q", value),
    300
  );

  return (
    <div className={`flex flex-col sm:flex-row gap-2 mb-4 ${isPending ? "opacity-60" : ""}`}>
      <Input
        placeholder="設問・回答で検索"
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => debouncedSearch(e.target.value)}
        className="sm:flex-1"
      />
      <Select
        value={searchParams.get("company") ?? ""}
        onChange={(e) => update("company", e.target.value)}
        className="sm:w-48"
      >
        <option value="">すべての企業</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
