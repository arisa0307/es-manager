import { getTodayPomodoroCount } from "@/lib/actions/pomodoro";
import { getFocusTasks } from "@/lib/actions/tasks";
import { FocusBoard } from "@/components/focus/FocusBoard";
import { Card } from "@/components/ui/Card";
import type { TaskWithCompany } from "@/types";

export const dynamic = "force-dynamic";

export default async function FocusPage() {
  let tasks: TaskWithCompany[] = [];
  let completedToday = 0;
  let error: string | null = null;

  try {
    [tasks, completedToday] = await Promise.all([
      getFocusTasks(),
      getTodayPomodoroCount(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "取得に失敗しました";
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      </div>
    );
  }

  const plannedPomos = tasks.reduce((sum, t) => sum + (t.est_pomos ?? 1), 0);

  return (
    <FocusBoard
      tasks={tasks}
      completedToday={completedToday}
      plannedPomos={plannedPomos}
    />
  );
}
