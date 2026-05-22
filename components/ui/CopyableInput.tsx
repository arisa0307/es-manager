"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export function CopyableInput({
  name,
  defaultValue = "",
  placeholder,
  autoComplete,
  className,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    const value = el?.value ?? defaultValue;
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      if (el) {
        el.select();
        document.execCommand("copy");
      }
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Input
        name={name}
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="font-mono text-sm flex-1"
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={copy}
        className="shrink-0"
        aria-label={`${name} をコピー`}
      >
        {copied ? "コピー済" : "コピー"}
      </Button>
    </div>
  );
}
