import { getTemplates } from "@/lib/actions/templates";
import { PageHeader } from "@/components/layout/PageHeader";
import { TemplateList } from "@/components/templates/TemplateList";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  let templates: Awaited<ReturnType<typeof getTemplates>> = [];
  let error: string | null = null;

  try {
    templates = await getTemplates(params.q);
  } catch (e) {
    error = e instanceof Error ? e.message : "取得に失敗しました";
  }

  return (
    <>
      <PageHeader
        title="ESテンプレ"
        description={`${templates.length} 件 — ES登録時に挿入できます`}
      />
      {error ? (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : (
        <TemplateList templates={templates} />
      )}
    </>
  );
}
