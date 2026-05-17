"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/ThemeProvider";

const navItems = [
  { href: "/", label: "ホーム", icon: "◻" },
  { href: "/companies", label: "企業", icon: "◇" },
  { href: "/es", label: "ES", icon: "✎" },
  { href: "/tasks", label: "タスク", icon: "☑" },
  { href: "/calendar", label: "カレンダー", icon: "▦" },
  { href: "/templates", label: "テンプレ", icon: "⎘" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

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
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="text-xs opacity-50 w-4 text-center">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={toggle}
            className="mt-auto flex items-center gap-2 px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-md transition-colors"
            aria-label="テーマ切替"
          >
            {theme === "dark" ? "☀ ライト" : "☾ ダーク"}
          </button>
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
                  "flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-[9px] shrink-0",
                  active
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                <span className="text-sm">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
