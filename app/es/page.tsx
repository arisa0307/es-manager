import { Suspense } from "react";
import { getCompanies } from "@/lib/actions/companies";
import { getESList } from "@/lib/actions/es";
import { getTemplates } from "@/lib/actions/templates";
import { PageHeader } from "@/components/layout/PageHeader";
import { ESFilters } from "@/components/es/ESFilters";
import { ESList } from "@/components/es/ESList";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function ESPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; company?: string }>;
}) {
  const params = await searchParams;
  let items: Awaited<ReturnType<typeof getESList>> = [];
  let companies: Awaited<ReturnType<typeof getCompanies>> = [];
  let templates: Awaited<ReturnType<typeof getTemplates>> = [];
  let error: string | null = null;

  try {
    [items, companies, templates] = await Promise.all([
      getESList(params.q, params.company),
      getCompanies(),
      getTemplates(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "取得に失敗しました";
  }

  return (
    <>
      <PageHeader title="ES管理" description={`${items.length} 件`} />
      <Suspense>
        <ESFilters companies={companies} />
      </Suspense>
      {error ? (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : (
        <ESList items={items} companies={companies} templates={templates} />
      )}
    </>
  );
}
