"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useFeatures } from "@/components/providers/FeaturesProvider";
import type { FeatureKey } from "@/lib/features";

const allNavItems: { href: string; label: string; icon: string; feature?: FeatureKey }[] = [
  { href: "/", label: "ホーム", icon: "◻" },
  { href: "/companies", label: "企業", icon: "◇" },
  { href: "/es", label: "ES", icon: "✎" },
  { href: "/tasks", label: "タスク", icon: "☑" },
  { href: "/focus", label: "集中", icon: "◐", feature: "focus" },
  { href: "/calendar", label: "カレンダー", icon: "▦" },
  { href: "/templates", label: "テンプレ", icon: "⎘" },
  { href: "/trash", label: "ゴミ箱", icon: "🗑" },
  { href: "/settings", label: "設定", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [isPending, startTransition] = useTransition();
  const features = useFeatures();
  // オフにした個人向け機能はメニューに出さない
  const navItems = allNavItems.filter((item) => !item.feature || features[item.feature]);

  return (
    <>
      <aside className="hidden md:flex md:w-52 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-sidebar">
        <div className="flex flex-col h-full px-3 py-5">
          <Link href="/" className="flex items-center gap-2 px-2 mb-6">
            <span className="font-bold text-foreground text-base tracking-tight">
              a.t
            </span>
            <span className="text-xs text-muted-foreground">就活管理</span>
          </Link>

          <nav className="flex-1 space-y-0.5">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-muted font-medium text-foreground before:absolute before:left-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-accent"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "w-4 text-center text-xs",
                      active ? "text-accent opacity-100" : "opacity-50"
                    )}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-1">
            <button
              onClick={toggle}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-md transition-colors"
              aria-label="テーマ切替"
            >
              {theme === "dark" ? "☀ ライト" : "☾ ダーク"}
            </button>
            <button
              onClick={() => startTransition(() => signOut())}
              disabled={isPending}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-md transition-colors disabled:opacity-60"
            >
              ログアウト
            </button>
          </div>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-sidebar/95 backdrop-blur-sm">
        <div className="flex justify-around py-1.5 px-0.5 overflow-x-auto">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[9px] transition-colors",
                  active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <span className={cn("text-sm", active && "text-accent")}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
