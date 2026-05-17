import { Suspense } from "react";
import { getCompanies } from "@/lib/actions/companies";
import { PageHeader } from "@/components/layout/PageHeader";
import { CompanyFilters } from "@/components/companies/CompanyFilters";
import { CompanyTable } from "@/components/companies/CompanyTable";
import { Card } from "@/components/ui/Card";
import type { CompanySortField, SortOrder } from "@/types";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    level?: string;
    sort?: string;
    order?: string;
  }>;
};

export default async function CompaniesPage({ searchParams }: Props) {
  const params = await searchParams;
  let companies: Awaited<ReturnType<typeof getCompanies>> = [];
  let error: string | null = null;

  try {
    companies = await getCompanies({
      search: params.q,
      status: params.status,
      desiredLevel: params.level,
      sort: (params.sort as CompanySortField) ?? "updated_at",
      order: (params.order as SortOrder) ?? "desc",
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "取得に失敗しました";
  }

  return (
    <>
      <PageHeader title="企業一覧" description={`${companies.length} 社`} />
      <Suspense>
        <CompanyFilters />
      </Suspense>
      {error ? (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : (
        <CompanyTable companies={companies} />
      )}
    </>
  );
}
