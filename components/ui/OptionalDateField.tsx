"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";

export function OptionalDateField({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string | null;
}) {
  const [noDate, setNoDate] = useState(!defaultValue);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={noDate}
          onChange={(e) => setNoDate(e.target.checked)}
          className="rounded border-border"
        />
        期日なし
      </label>
      {noDate ? (
        <input type="hidden" name={name} value="" />
      ) : (
        <Input type="date" name={name} defaultValue={defaultValue ?? ""} />
      )}
    </div>
  );
}
