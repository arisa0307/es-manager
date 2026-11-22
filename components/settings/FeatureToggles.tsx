"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setFeatureEnabled } from "@/lib/actions/settings";
import { PERSONAL_FEATURES, type FeatureFlags, type FeatureKey } from "@/lib/features";

export function FeatureToggles({ flags }: { flags: FeatureFlags }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useOptimistic(
    flags,
    (state: FeatureFlags, change: { key: FeatureKey; value: boolean }) => ({
      ...state,
      [change.key]: change.value,
    })
  );

  const toggle = (key: FeatureKey, value: boolean) => {
    setError(null);
    startTransition(async () => {
      setOptimistic({ key, value });
      try {
        await setFeatureEnabled(key, value);
      } catch (e) {
        setError(e instanceof Error ? e.message : "保存に失敗しました");
      }
    });
  };

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      <ul className="divide-y divide-border">
        {PERSONAL_FEATURES.map((f) => {
          const on = optimistic[f.key];
          const id = `feature-${f.key}`;
          return (
            <li key={f.key} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <label htmlFor={id} className="text-sm font-medium text-foreground">
                  {f.label}
                </label>
                <p className="mt-0.5 text-xs text-muted-foreground">{f.description}</p>
              </div>
              <button
                id={id}
                type="button"
                role="switch"
                aria-checked={on}
                disabled={isPending}
                onClick={() => toggle(f.key, !on)}
                className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 ${
                  on ? "bg-accent" : "bg-muted-foreground/30"
                }`}
              >
                <span className="sr-only">{on ? "オン" : "オフ"}</span>
                <span
                  aria-hidden
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    on ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
