import { getPomodoroLog, getTodayPomodoroCount } from "@/lib/actions/pomodoro";
import { getFocusTasks, getOpenTasksForFocus } from "@/lib/actions/tasks";
import { FocusBoard } from "@/components/focus/FocusBoard";
import { PomodoroLog } from "@/components/focus/PomodoroLog";
import { Card } from "@/components/ui/Card";
import type { PomodoroLogEntry, TaskWithCompany } from "@/types";

export const dynamic = "force-dynamic";

export default async function FocusPage() {
  let tasks: TaskWithCompany[] = [];
  let openTasks: TaskWithCompany[] = [];
  let completedToday = 0;
  let pomoLog: PomodoroLogEntry[] = [];
  let error: string | null = null;

  try {
    [tasks, openTasks, completedToday, pomoLog] = await Promise.all([
      getFocusTasks(),
      getOpenTasksForFocus(),
      getTodayPomodoroCount(),
      getPomodoroLog(7),
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
    <>
      <FocusBoard
        tasks={tasks}
        openTasks={openTasks}
        completedToday={completedToday}
        plannedPomos={plannedPomos}
      />
      <div className="max-w-2xl mx-auto">
        <PomodoroLog entries={pomoLog} />
      </div>
    </>
  );
}
