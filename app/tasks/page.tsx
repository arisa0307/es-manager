import { Suspense } from "react";
import { getCompanies } from "@/lib/actions/companies";
import { getTasks } from "@/lib/actions/tasks";
import { PageHeader } from "@/components/layout/PageHeader";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { TaskList } from "@/components/tasks/TaskList";
import { Card } from "@/components/ui/Card";
import { getFeatureFlags } from "@/lib/features-server";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    priority?: string;
    kind?: string;
    done?: string;
    sort?: "deadline" | "desired_level";
    order?: "asc" | "desc";
    item?: string;
  }>;
}) {
  const params = await searchParams;
  const features = await getFeatureFlags();
  let tasks: Awaited<ReturnType<typeof getTasks>> = [];
  let companies: Awaited<ReturnType<typeof getCompanies>> = [];
  let error: string | null = null;

  // 既定は未完了のみ。すべて見たいときは done=all を指定する。
  // item=... で1件を開くときは、完了済みでも見つかるように絞り込みを外す。
  const isDone =
    params.done === "all" || (params.item && !params.done)
      ? undefined
      : params.done === "true"
        ? true
        : false;

  try {
    [tasks, companies] = await Promise.all([
      getTasks({
        search: params.q,
        priority: params.priority,
        // 種別の機能がオフなら、URL に残った種別の絞り込みは使わない
        kind: features.gtd ? params.kind : undefined,
        isDone,
        sort: params.sort,
        order: params.order,
      }),
      getCompanies(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "取得に失敗しました";
  }

  return (
    <>
      <PageHeader title="タスク管理" description={`${tasks.length} 件`} />
      <Suspense>
        <TaskFilters />
      </Suspense>
      {error ? (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : (
        <TaskList tasks={tasks} companies={companies} initialItem={params.item ?? null} />
      )}
    </>
  );
}
