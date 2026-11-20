import { getFocusData } from "@/lib/actions/pomodoro";
import { getFocusTasks, getOpenTasksForFocus } from "@/lib/actions/tasks";
import { FocusBoard } from "@/components/focus/FocusBoard";
import { Card } from "@/components/ui/Card";
import { classifySession, groupOf } from "@/lib/focus-categories";
import { getFocusDayString } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FocusPage() {
  let data: {
    tasks: Awaited<ReturnType<typeof getFocusTasks>>;
    openTasks: Awaited<ReturnType<typeof getOpenTasksForFocus>>;
    focus: Awaited<ReturnType<typeof getFocusData>>;
  } | null = null;
  let error: string | null = null;

  try {
    const [tasks, openTasks, focus] = await Promise.all([
      getFocusTasks(),
      getOpenTasksForFocus(),
      getFocusData(7),
    ]);
    data = { tasks, openTasks, focus };
  } catch (e) {
    error = e instanceof Error ? e.message : "取得に失敗しました";
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      </div>
    );
  }

  // 目標 = 今日の並びの見積もりポモ合計 × 25分を、就活/勉強に分けたもの
  // (固定の対象はタスクではないので入らない)
  const goals = { shukatsu: 0, study: 0 };
  for (const t of data.tasks) {
    goals[groupOf(classifySession(t, null))] += (t.est_pomos ?? 1) * 25 * 60;
  }

  return (
    <FocusBoard
      tasks={data.tasks}
      openTasks={data.openTasks}
      sessions={data.focus.sessions}
      active={data.focus.active}
      taskTotals={data.focus.taskTotals}
      goals={goals}
      today={getFocusDayString()}
    />
  );
}
