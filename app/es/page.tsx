import { Suspense } from "react";
import { getCompanies } from "@/lib/actions/companies";
import { getESSubmissions } from "@/lib/actions/es";
import { getTemplates } from "@/lib/actions/templates";
import { PageHeader } from "@/components/layout/PageHeader";
import { ESFilters } from "@/components/es/ESFilters";
import { ESList } from "@/components/es/ESList";
import { Card } from "@/components/ui/Card";
import type { ESSubmissionWithDetails } from "@/types";

export const dynamic = "force-dynamic";

export default async function ESPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; company?: string }>;
}) {
  const params = await searchParams;
  let submissions: ESSubmissionWithDetails[] = [];
  let companies: Awaited<ReturnType<typeof getCompanies>> = [];
  let templates: Awaited<ReturnType<typeof getTemplates>> = [];
  let error: string | null = null;

  try {
    [submissions, companies, templates] = await Promise.all([
      getESSubmissions(params.company),
      getCompanies(),
      getTemplates(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "取得に失敗しました";
  }

  const q = params.q?.trim().toLowerCase();
  if (q) {
    submissions = submissions.filter((s) => {
      const hay = [
        s.companies?.name,
        s.title,
        s.phase,
        ...(s.es ?? []).flatMap((e) => [e.question, e.answer]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  const questionCount = submissions.reduce(
    (n, s) => n + (s.es?.length ?? 0),
    0
  );

  return (
    <>
      <PageHeader
        title="ES管理"
        description={`${submissions.length} 提出 ・ ${questionCount} 設問`}
      />
      <Suspense>
        <ESFilters companies={companies} />
      </Suspense>
      {error ? (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : (
        <ESList
          submissions={submissions}
          companies={companies}
          templates={templates}
        />
      )}
    </>
  );
}
