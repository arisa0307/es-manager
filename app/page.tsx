import Link from "next/link";
import { claimOrphanedUserData } from "@/lib/actions/claim-orphan-data";
import { getCompanyStats, getCompanies } from "@/lib/actions/companies";
import { getGeneralEvents } from "@/lib/actions/general-events";
import { getScheduleForDates } from "@/lib/actions/schedule";
import { getTaskStats, getTasks } from "@/lib/actions/tasks";
import { GeneralEventsSection } from "@/components/dashboard/GeneralEventsSection";
import { TodayTomorrowSchedule } from "@/components/dashboard/TodayTomorrowSchedule";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getStatusColor, getLevelColor, formatDate, getTodayString, addDaysToDateString } from "@/lib/utils";
import { COMPANY_STATUSES, DESIRED_LEVELS, type CompanyStatus, type DesiredLevel, type ScheduleItem } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let error: string | null = null;
  let companyStats = { total: 0, byStatus: {} as Record<string, number>, byLevel: {} as Record<string, number> };
  let taskStats = { pending: 0, completed: 0, overdue: 0, total: 0 };
  let companies: Awaited<ReturnType<typeof getCompanies>> = [];
  let activeCompanies: Awaited<ReturnType<typeof getCompanies>> = [];
  let tasks: Awaited<ReturnType<typeof getTasks>> = [];
  let nearestTaskByCompany = new Map<
    string,
    Awaited<ReturnType<typeof getTasks>>[number]
  >();
  let generalEvents: Awaited<ReturnType<typeof getGeneralEvents>> = [];
  let todayItems: ScheduleItem[] = [];
  let tomorrowItems: ScheduleItem[] = [];
  const today = getTodayString();
  const tomorrow = addDaysToDateString(today, 1);

  try {
    await claimOrphanedUserData();
    [companyStats, taskStats, companies, tasks, generalEvents, todayItems, tomorrowItems] =
      await Promise.all([
      getCompanyStats(),
      getTaskStats(),
      getCompanies({ sort: "deadline", order: "asc" }),
      getTasks({ isDone: false }),
      getGeneralEvents(),
      getScheduleForDates([today]),
      getScheduleForDates([tomorrow]),
    ]);
    activeCompanies = companies
      .filter((c) =>
        ["マイページ登録済み", "ES", "Webテスト", "面接"].includes(c.status)
      )
      .slice(0, 6);
    nearestTaskByCompany = new Map();
    for (const task of tasks) {
      if (!task.company_id || nearestTaskByCompany.has(task.company_id)) continue;
      nearestTaskByCompany.set(task.company_id, task);
    }
    companies = companies.filter((c) => !c.deadline || c.deadline >= today).slice(0, 5);
    tasks = tasks.filter((t) => t.deadline && t.deadline >= today).slice(0, 5);
  } catch (e) {
    error = e instanceof Error ? e.message : "データ取得に失敗しました";
  }

  return (
    <>
      <PageHeader title="ダッシュボード" description="a.t — 就活の進捗を確認" />

      {error && (
        <Card className="mb-4 border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="企業" value={companyStats.total} />
        <Stat label="未完了タスク" value={taskStats.pending} />
        <Stat label="完了" value={taskStats.completed} />
        <Stat label="持ち駒" value={activeCompanies.length} />
      </div>

      <div className="mb-6">
        <TodayTomorrowSchedule
          today={today}
          tomorrow={tomorrow}
          todayItems={todayItems}
          tomorrowItems={tomorrowItems}
        />
      </div>

      <div className="mb-6">
        <GeneralEventsSection events={generalEvents} today={today} />
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <section>
          <SectionLink href="/companies" label="ステータス別" />
          <Card>
            <div className="space-y-2">
              {COMPANY_STATUSES.map((s) => {
                const n = companyStats.byStatus[s] ?? 0;
                if (!n) return null;
                return (
                  <div key={s} className="flex justify-between text-sm">
                    <Badge className={getStatusColor(s as CompanyStatus)}>{s}</Badge>
                    <span>{n}</span>
                  </div>
                );
              })}
              {companyStats.total === 0 && <p className="text-sm text-muted-foreground text-center py-2">企業なし</p>}
            </div>
          </Card>
        </section>

        <section>
          <SectionLink href="/companies" label="志望度別" />
          <Card>
            <div className="space-y-2">
              {DESIRED_LEVELS.map((l) => {
                const n = companyStats.byLevel[l] ?? 0;
                if (!n) return null;
                return (
                  <div key={l} className="flex justify-between text-sm">
                    <Badge className={getLevelColor(l as DesiredLevel)}>{l}</Badge>
                    <span>{n}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      </div>

      <section className="mt-6">
        <SectionLink href="/companies" label="持ち駒" />
        <Card>
          {activeCompanies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">なし</p>
          ) : (
            <ul className="space-y-2">
              {activeCompanies.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/companies/${c.id}`}
                    className="flex items-center justify-between gap-3 text-sm py-1 hover:bg-muted/50 -mx-2 px-2 rounded"
                  >
                    <span className="min-w-0">
                      <span className="font-medium text-foreground">{c.name}</span>
                      {nearestTaskByCompany.get(c.id) && (
                        <span className="block text-xs text-muted-foreground truncate">
                          直近タスク: {nearestTaskByCompany.get(c.id)?.title}
                          {nearestTaskByCompany.get(c.id)?.deadline &&
                            ` (${formatDate(nearestTaskByCompany.get(c.id)?.deadline ?? null)})`}
                        </span>
                      )}
                      {c.next_action && (
                        <span className="block text-xs text-muted-foreground truncate">
                          次のメモ: {c.next_action}
                        </span>
                      )}
                    </span>
                    <Badge className={getStatusColor(c.status as CompanyStatus)}>
                      {c.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="mt-6">
        <SectionLink href="/tasks" label="直近の締切タスク" />
        <Card>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">なし</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.id} className="text-sm flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block">{t.title}</span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {t.companies?.name ?? "企業未設定"}
                    </span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatDate(t.deadline)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="mt-6">
        <SectionLink href="/companies" label="企業（締切順）" />
        <Card>
          {companies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">なし</p>
          ) : (
            <ul className="space-y-1">
              {companies.map((c) => (
                <li key={c.id}>
                  <Link href={`/companies/${c.id}`} className="flex justify-between text-sm py-1 hover:bg-muted/50 -mx-2 px-2 rounded">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground">{formatDate(c.deadline)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </>
  );
}

function Stat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <Card className="text-center py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold mt-0.5 ${alert ? "text-red-600" : ""}`}>{value}</p>
    </Card>
  );
}

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="flex justify-between mb-3">
      <h2 className="text-sm font-medium">{label}</h2>
      <Link href={href} className="text-xs text-muted-foreground hover:underline">すべて →</Link>
    </div>
  );
}
