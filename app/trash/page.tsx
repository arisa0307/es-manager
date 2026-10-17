import { getTrashedItems } from "@/lib/actions/trash";
import { PageHeader } from "@/components/layout/PageHeader";
import { TrashList } from "@/components/trash/TrashList";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  let items: Awaited<ReturnType<typeof getTrashedItems>> = [];
  let error: string | null = null;

  try {
    items = await getTrashedItems();
  } catch (e) {
    error = e instanceof Error ? e.message : "取得に失敗しました";
  }

  return (
    <>
      <PageHeader
        title="ゴミ箱"
        description="削除した予定・タスクを戻せます（完全削除は元に戻せません）"
      />
      {error ? (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : (
        <TrashList items={items} />
      )}
    </>
  );
}
