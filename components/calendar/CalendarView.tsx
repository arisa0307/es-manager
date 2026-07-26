"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getCalendarDays } from "@/lib/utils";
import type { CalendarEvent } from "@/types";

export function CalendarView({ events }: { events: CalendarEvent[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const year = parseInt(searchParams.get("y") ?? String(new Date().getFullYear()), 10);
  const month = parseInt(searchParams.get("m") ?? String(new Date().getMonth()), 10);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const days = useMemo(() => getCalendarDays(year, month), [year, month]);

  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    for (const e of events) {
      const d = new Date(e.date + "T00:00:00");
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(e);
      }
    }
    return map;
  }, [events, year, month]);

  const navigate = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    const params = new URLSearchParams(searchParams.toString());
    params.set("y", String(d.getFullYear()));
    params.set("m", String(d.getMonth()));
    setSelectedDay(null);
    router.push(`/calendar?${params.toString()}`);
  };

  const monthLabel = new Date(year, month, 1).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
  });

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day;

  const selectedEvents = selectedDay !== null ? (eventsByDay[selectedDay] ?? []) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          ←
        </Button>
        <h2 className="text-lg font-medium">{monthLabel}</h2>
        <Button variant="ghost" size="sm" onClick={() => navigate(1)}>
          →
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
          <div key={d} className="bg-muted text-center text-xs py-1.5 text-muted-foreground font-medium">
            {d}
          </div>
        ))}
        {days.map((day, i) => (
          <div
            key={i}
            onClick={() => {
              if (day !== null && (eventsByDay[day]?.length ?? 0) > 0) {
                setSelectedDay(selectedDay === day ? null : day);
              }
            }}
            className={`bg-card min-h-[72px] p-1 ${day === null ? "bg-muted/30" : ""} ${
              day !== null && (eventsByDay[day]?.length ?? 0) > 0
                ? "cursor-pointer hover:bg-muted/40 transition-colors"
                : ""
            } ${selectedDay === day ? "ring-2 ring-inset ring-accent" : ""}`}
          >
            {day !== null && (
              <>
                <span
                  className={`text-xs inline-flex w-5 h-5 items-center justify-center rounded-full ${
                    isToday(day) ? "bg-foreground text-background font-medium" : "text-muted-foreground"
                  }`}
                >
                  {day}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {(eventsByDay[day] ?? []).slice(0, 2).map((e) => (
                    <span
                      key={e.id}
                      className={`block text-[10px] leading-tight truncate rounded px-0.5 ${getCalendarEventColor(e.type)}`}
                    >
                      {e.title}
                    </span>
                  ))}
                  {(eventsByDay[day]?.length ?? 0) > 2 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{(eventsByDay[day]?.length ?? 0) - 2}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {selectedDay !== null && (
        <Card className="mt-4 border-accent/30 bg-accent/5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">
              {year}年{month + 1}月{selectedDay}日の予定（{selectedEvents.length}件）
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>
              閉じる
            </Button>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">予定はありません</p>
          ) : (
            <ul className="space-y-1.5">
              {selectedEvents.map((e) => (
                <li key={e.id}>
                  <Link
                    href={e.href}
                    className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 hover:bg-muted/30 transition-colors"
                  >
                    <span
                      className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${getCalendarEventColor(e.type)}`}
                    >
                      {getCalendarEventTypeLabel(e.type)}
                    </span>
                    <span className="min-w-0 text-sm break-words">{e.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card className="mt-4">
        <p className="text-xs text-muted-foreground mb-2">
          凡例（日付をクリックするとその日の予定が全文表示されます）
        </p>
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-blue-500/50" /> 企業締切
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-amber-500/50" /> タスク
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-emerald-500/50" /> インターン
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-pink-500/50" /> 面接
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-violet-500/50" /> 合同説明会
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-cyan-500/50" /> セミナー
          </span>
        </div>
      </Card>
    </div>
  );
}

function getCalendarEventColor(type: CalendarEvent["type"]): string {
  switch (type) {
    case "company":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "task":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "info_session":
      return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "internship":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "es":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "web_test":
      return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
    case "gd":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-300";
    case "interview":
      return "bg-pink-500/10 text-pink-700 dark:text-pink-300";
    case "career_fair":
      return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "seminar":
      return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
    case "other":
      return "bg-muted text-muted-foreground";
  }
}

function getCalendarEventTypeLabel(type: CalendarEvent["type"]): string {
  switch (type) {
    case "company":
      return "企業締切";
    case "task":
      return "タスク";
    case "info_session":
      return "説明会";
    case "internship":
      return "インターン";
    case "es":
      return "ES";
    case "web_test":
      return "Webテスト";
    case "gd":
      return "GD";
    case "interview":
      return "面接";
    case "career_fair":
      return "合同説明会";
    case "seminar":
      return "セミナー";
    case "other":
      return "その他";
  }
}
