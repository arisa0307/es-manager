"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useDebouncedCallback } from "@/lib/use-debounced-callback";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS } from "@/types";

export function TaskFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      startTransition(() => router.push(`/tasks?${params.toString()}`));
    },
    [router, searchParams]
  );

  const debouncedSearch = useDebouncedCallback(
    (value: string) => update("q", value),
    300
  );

  return (
    <div className={`flex flex-col sm:flex-row gap-2 mb-4 ${isPending ? "opacity-60" : ""}`}>
      <Input placeholder="検索" defaultValue={searchParams.get("q") ?? ""} onChange={(e) => debouncedSearch(e.target.value)} className="sm:flex-1" />
      <Select value={searchParams.get("priority") ?? ""} onChange={(e) => update("priority", e.target.value)} className="sm:w-28">
        <option value="">優先度</option>
        {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>)}
      </Select>
      <Select value={searchParams.get("done") ?? ""} onChange={(e) => update("done", e.target.value)} className="sm:w-28">
        <option value="">すべて</option>
        <option value="false">未完了</option>
        <option value="true">完了</option>
      </Select>
      <Select value={searchParams.get("sort") ?? "deadline"} onChange={(e) => update("sort", e.target.value)} className="sm:w-36">
        <option value="deadline">締切順</option>
        <option value="desired_level">志望度順</option>
      </Select>
      <Select value={searchParams.get("order") ?? "asc"} onChange={(e) => update("order", e.target.value)} className="sm:w-28">
        <option value="asc">昇順</option>
        <option value="desc">降順</option>
      </Select>
    </div>
  );
}
