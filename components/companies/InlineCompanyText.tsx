"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateCompany } from "@/lib/actions/companies";
import { cn } from "@/lib/utils";

/**
 * 企業固有の「進捗状況」を一覧上でその場編集する自由記述フィールド。
 * 普段はバッジ風に表示し、クリックすると入力欄になり、Enter/フォーカス外しで保存する。
 */
export function InlineCompanyText({
  companyId,
  value,
  placeholder = "進捗を記入",
  className,
}: {
  companyId: string;
  value: string | null;
  placeholder?: string;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  const save = () => {
    setEditing(false);
    const next = draft.trim() || null;
    if (next === (value ?? null)) return;
    startTransition(async () => {
      await updateCompany(companyId, { progress_note: next });
      router.refresh();
    });
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          // IME変換中(日本語入力の変換確定)のEnterは保存扱いにしない
          if (e.nativeEvent.isComposing) return;
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setDraft(value ?? "");
            setEditing(false);
          }
        }}
        placeholder={placeholder}
        className={cn(
          "w-full max-w-[16rem] rounded-md border border-accent bg-card px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring",
          className
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDraft(value ?? "");
        setEditing(true);
      }}
      disabled={isPending}
      title="クリックで編集"
      className={cn(
        "inline-flex max-w-full items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50",
        value
          ? "bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/20 dark:text-indigo-300"
          : "border border-dashed border-border text-muted-foreground hover:border-accent hover:text-accent",
        className
      )}
    >
      <span className="truncate">{value || `＋ ${placeholder}`}</span>
    </button>
  );
}
