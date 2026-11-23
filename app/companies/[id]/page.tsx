import Link from "next/link";
import { getCompany } from "@/lib/actions/companies";
import { getESSubmissions } from "@/lib/actions/es";
import { getTasks } from "@/lib/actions/tasks";
import { getCompanyEvents } from "@/lib/actions/company-events";
import { CompanyDetail } from "@/components/companies/CompanyDetail";
import { Card } from "@/components/ui/Card";
import { parseOpenSections } from "@/lib/item-links";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ open?: string; item?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  let company: Awaited<ReturnType<typeof getCompany>>;
  let esSubmissions: Awaited<ReturnType<typeof getESSubmissions>>;
  let tasks: Awaited<ReturnType<typeof getTasks>>;
  let events: Awaited<ReturnType<typeof getCompanyEvents>>;

  try {
    [company, esSubmissions, tasks, events] = await Promise.all([
      getCompany(id),
      getESSubmissions(id),
      getTasks({ companyId: id }),
      getCompanyEvents(id),
    ]);
  } catch {
    return (
      <Card>
        <p className="text-muted-foreground mb-4">企業が見つかりません</p>
        <Link href="/companies" className="text-sm hover:underline">← 一覧</Link>
      </Card>
    );
  }

  return (
    <CompanyDetail
      company={company}
      esSubmissions={esSubmissions}
      tasks={tasks}
      events={events}
      initialOpen={[...parseOpenSections(query.open)]}
      initialItem={query.item ?? null}
    />
  );
}
