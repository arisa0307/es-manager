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
  masked = false,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
  /** パスワードなど、初期状態を伏せ字にして表示トグルを出す */
  masked?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

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
        type={masked && !revealed ? "password" : "text"}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="flex-1 font-mono text-sm"
      />
      {masked && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setRevealed((v) => !v)}
          className="shrink-0"
          aria-label={revealed ? "パスワードを隠す" : "パスワードを表示"}
        >
          {revealed ? "隠す" : "表示"}
        </Button>
      )}
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
