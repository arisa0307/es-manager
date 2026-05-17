import Link from "next/link";
import { getCompany } from "@/lib/actions/companies";
import { getESByCompany } from "@/lib/actions/es";
import { getTasks } from "@/lib/actions/tasks";
import { CompanyDetail } from "@/components/companies/CompanyDetail";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const [company, esList, tasks] = await Promise.all([
      getCompany(id),
      getESByCompany(id),
      getTasks({ companyId: id }),
    ]);
    return <CompanyDetail company={company} esList={esList} tasks={tasks} />;
  } catch {
    return (
      <Card>
        <p className="text-muted-foreground mb-4">企業が見つかりません</p>
        <Link href="/companies" className="text-sm hover:underline">← 一覧</Link>
      </Card>
    );
  }
}
