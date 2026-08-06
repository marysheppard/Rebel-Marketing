"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ClientProfitChart,
  EmployeeBudgetChart,
  EmployeeTrackChart,
  MonthlySeriesChart,
  type DonutBreakdownSlice,
} from "@/components/Charts";
import {
  CustomizeLayoutButton,
  DashboardCustomizePanel,
} from "@/components/dashboards/DashboardCustomizePanel";
import { StatusBadge, StatCard } from "@/components/ui";
import { budgetHealth, remainingBalance } from "@/lib/finance";
import { money, num, pct } from "@/lib/format";
import { clientProfitabilityRow } from "@/lib/metrics";
import {
  PERIOD_OPTIONS,
  inPeriod,
  resolvePeriod,
  type PeriodKey,
} from "@/lib/period";
import { withPeriod } from "@/lib/period-url";
import {
  AGENCY_PORTFOLIO_SECTIONS,
  AGENCY_PORTFOLIO_STORAGE,
  AM_PORTFOLIO_SECTIONS,
  AM_PORTFOLIO_STORAGE,
  type AgencyPortfolioSectionId,
  type AmPortfolioSectionId,
} from "@/lib/portfolio-dashboard-layout";
import { useDashboardLayout } from "@/lib/use-dashboard-layout";
import { usePeriodParam } from "@/lib/use-period-param";

function mostCommonAssignee(
  tasks: { assignee_id: string | null }[],
  profiles: { id: string; full_name: string }[],
): string | null {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (!t.assignee_id) continue;
    counts.set(t.assignee_id, (counts.get(t.assignee_id) ?? 0) + 1);
  }
  let bestId: string | null = null;
  let best = 0;
  for (const [id, count] of counts) {
    if (count > best) {
      best = count;
      bestId = id;
    }
  }
  if (!bestId) return null;
  return profiles.find((p) => p.id === bestId)?.full_name ?? null;
}

export type PortfolioDashboardSource = {
  fullName: string;
  openExceptions: number;
  pendingApprovals: number;
  openTasksOnBook: number;
  overdueTasksOnBook: number;
  clients: {
    id: string;
    client_name: string;
    status?: string;
  }[];
  campaigns: {
    id: string;
    campaign_name: string;
    client_id: string;
    campaign_budget: number | string;
    campaign_status: string;
  }[];
  invoices: {
    client_id: string;
    campaign_id: string | null;
    total_amount: number | string;
    status: string;
    invoice_date: string;
    due_date: string;
    payments?: { amount: number | string }[] | null;
  }[];
  costs: {
    client_id: string | null;
    campaign_id: string | null;
    amount: number | string;
    cost_date: string;
  }[];
  work: {
    campaign_id: string;
    user_id: string;
    hours: number | string;
    work_date: string;
  }[];
  profiles: {
    id: string;
    full_name: string;
    role: string;
    internal_cost_rate?: number | null;
  }[];
  tasks: {
    id: string;
    assignee_id: string | null;
    status: string;
    due_date: string | null;
  }[];
  assignments: { user_id: string; campaign_id: string }[];
};

export type PortfolioDashboardVariant = "agency" | "account_manager";

/** @deprecated Use PortfolioDashboardSource */
export type AgencyDashboardSource = PortfolioDashboardSource;

const DASH_PERIODS = PERIOD_OPTIONS.filter((o) => o.value !== "custom");

function laborByClient(
  work: PortfolioDashboardSource["work"],
  campaigns: PortfolioDashboardSource["campaigns"],
  profiles: PortfolioDashboardSource["profiles"],
  start: string | null,
  end: string | null,
) {
  const campClient = new Map(campaigns.map((c) => [c.id, c.client_id]));
  const rates = new Map(
    profiles.map((p) => [p.id, num(p.internal_cost_rate ?? 75)]),
  );
  const map = new Map<string, number>();
  for (const w of work) {
    if (!inPeriod(w.work_date, start, end)) continue;
    const clientId = campClient.get(w.campaign_id);
    if (!clientId) continue;
    const rate = rates.get(w.user_id) ?? 75;
    map.set(clientId, (map.get(clientId) ?? 0) + num(w.hours) * rate);
  }
  return map;
}

export function PortfolioDashboardClient({
  source,
  variant = "agency",
  userId,
}: {
  source: PortfolioDashboardSource;
  variant?: PortfolioDashboardVariant;
  userId: string;
}) {
  const isAm = variant === "account_manager";
  const { period, setPeriod } = usePeriodParam("ytd");
  const range = useMemo(() => resolvePeriod(period, "", ""), [period]);
  const p = (href: string) => withPeriod(href, period);

  const agencyLayout = useDashboardLayout({
    userId,
    storagePrefix: AGENCY_PORTFOLIO_STORAGE,
    sections: AGENCY_PORTFOLIO_SECTIONS,
  });
  const amLayout = useDashboardLayout({
    userId,
    storagePrefix: AM_PORTFOLIO_STORAGE,
    sections: AM_PORTFOLIO_SECTIONS,
  });
  const layout = isAm ? amLayout : agencyLayout;

  const periodInvoices = useMemo(
    () =>
      source.invoices.filter(
        (i) =>
          !["Draft", "Canceled"].includes(i.status) &&
          inPeriod(i.invoice_date, range.start, range.end),
      ),
    [source.invoices, range.start, range.end],
  );
  const periodCosts = useMemo(
    () =>
      source.costs.filter((c) =>
        inPeriod(c.cost_date, range.start, range.end),
      ),
    [source.costs, range.start, range.end],
  );

  const revenue = periodInvoices.reduce((s, i) => s + num(i.total_amount), 0);
  const totalCosts = periodCosts.reduce((s, c) => s + num(c.amount), 0);
  const profit = revenue - totalCosts;
  const margin = revenue > 0 ? (profit / revenue) * 100 : null;

  const ar = source.invoices.reduce((s, i) => s + remainingBalance(i), 0);
  const outstandingCount = source.invoices.filter(
    (i) => remainingBalance(i) > 0,
  ).length;

  const today = new Date().toISOString().slice(0, 10);
  const overdueCount = source.invoices.filter(
    (i) => remainingBalance(i) > 0 && i.due_date < today,
  ).length;

  const laborMap = useMemo(
    () =>
      laborByClient(
        source.work,
        source.campaigns,
        source.profiles,
        range.start,
        range.end,
      ),
    [source.work, source.campaigns, source.profiles, range.start, range.end],
  );

  const revByClient = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of periodInvoices) {
      map.set(i.client_id, (map.get(i.client_id) ?? 0) + num(i.total_amount));
    }
    return map;
  }, [periodInvoices]);

  const costMap = useMemo(() => {
    const campClient = new Map(
      source.campaigns.map((c) => [c.id, c.client_id]),
    );
    const map = new Map<string, number>();
    for (const c of periodCosts) {
      const clientId =
        c.client_id ?? (c.campaign_id ? campClient.get(c.campaign_id) : null);
      if (!clientId) continue;
      map.set(clientId, (map.get(clientId) ?? 0) + num(c.amount));
    }
    return map;
  }, [periodCosts, source.campaigns]);

  const byClient = useMemo(
    () =>
      source.clients
        .map((cl) => {
          const rev = revByClient.get(cl.id) ?? 0;
          const labor = laborMap.get(cl.id) ?? 0;
          const direct = costMap.get(cl.id) ?? 0;
          return {
            ...clientProfitabilityRow(
              cl.id,
              cl.client_name,
              rev,
              direct,
              labor,
              0,
            ),
            status: cl.status ?? "—",
          };
        })
        .filter((r) => r.revenue > 0 || r.costs > 0)
        .sort((a, b) => b.profit - a.profit),
    [source.clients, revByClient, laborMap, costMap],
  );

  const profitSeries = useMemo(() => {
    const map = new Map<string, { revenue: number; costs: number }>();
    for (const i of periodInvoices) {
      if (!i.invoice_date) continue;
      const key = i.invoice_date.slice(0, 7);
      const cur = map.get(key) ?? { revenue: 0, costs: 0 };
      cur.revenue += num(i.total_amount);
      map.set(key, cur);
    }
    for (const c of periodCosts) {
      if (!c.cost_date) continue;
      const key = c.cost_date.slice(0, 7);
      const cur = map.get(key) ?? { revenue: 0, costs: 0 };
      cur.costs += num(c.amount);
      map.set(key, cur);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        profit: v.revenue - v.costs,
      }));
  }, [periodInvoices, periodCosts]);

  const costsByCamp = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of periodCosts) {
      if (!c.campaign_id) continue;
      map.set(c.campaign_id, (map.get(c.campaign_id) ?? 0) + num(c.amount));
    }
    return map;
  }, [periodCosts]);

  let campsOver = 0;
  for (const camp of source.campaigns) {
    const budget = num(camp.campaign_budget);
    if (budget <= 0) continue;
    const health = budgetHealth(budget, costsByCamp.get(camp.id) ?? 0);
    if (health === "over") campsOver++;
  }

  const staff = source.profiles.filter(
    (p) =>
      p.role === "marketing" ||
      p.role === "account_manager" ||
      p.role === "agency_manager",
  );

  const tasksByUser = useMemo(() => {
    const map = new Map<string, typeof source.tasks>();
    for (const t of source.tasks) {
      if (!t.assignee_id) continue;
      const list = map.get(t.assignee_id) ?? [];
      list.push(t);
      map.set(t.assignee_id, list);
    }
    return map;
  }, [source.tasks]);

  let tasksAtRisk = 0;
  const capacityRows: {
    id: string;
    name: string;
    open: number;
    overdue: number;
  }[] = [];

  for (const pRow of staff) {
    const list = tasksByUser.get(pRow.id) ?? [];
    let open = 0;
    let overdue = 0;
    for (const t of list) {
      if (t.status === "Completed") continue;
      open++;
      const late = t.due_date != null && t.due_date < today;
      if (late) {
        overdue++;
        tasksAtRisk++;
      }
    }
    if (open > 0 || !isAm) {
      capacityRows.push({
        id: pRow.id,
        name: pRow.full_name,
        open,
        overdue,
      });
    }
  }
  capacityRows.sort((a, b) => b.overdue - a.overdue || b.open - a.open);

  const onTrackSlices = useMemo((): DonutBreakdownSlice[] => {
    const onTrackTasks = source.tasks.filter((t) => {
      if (t.status === "Completed") return false;
      return !(t.due_date != null && t.due_date < today);
    });
    const atRiskTasks = source.tasks.filter((t) => {
      if (t.status === "Completed") return false;
      return t.due_date != null && t.due_date < today;
    });
    const topOnTrack = mostCommonAssignee(onTrackTasks, source.profiles);
    const topAtRisk = mostCommonAssignee(atRiskTasks, source.profiles);
    const total = onTrackTasks.length + atRiskTasks.length;
    const slices: DonutBreakdownSlice[] = [];
    if (onTrackTasks.length > 0) {
      slices.push({
        key: "On track",
        name: "On track",
        value: onTrackTasks.length,
        count: onTrackTasks.length,
        share: total > 0 ? (onTrackTasks.length / total) * 100 : null,
        color: "#22c55e",
        insights: [
          { label: "Open tasks", value: String(onTrackTasks.length) },
          { label: "Top assignee", value: topOnTrack ?? "Not available" },
        ],
      });
    }
    if (atRiskTasks.length > 0) {
      slices.push({
        key: "At risk / overdue",
        name: "At risk / overdue",
        value: atRiskTasks.length,
        count: atRiskTasks.length,
        share: total > 0 ? (atRiskTasks.length / total) * 100 : null,
        color: "#f43f5e",
        insights: [
          { label: "Overdue tasks", value: String(atRiskTasks.length) },
          { label: "Top assignee", value: topAtRisk ?? "Not available" },
        ],
      });
    }
    return slices;
  }, [source.tasks, source.profiles, today]);

  const onBudgetSlices = useMemo((): DonutBreakdownSlice[] => {
    type CampRow = {
      name: string;
      budget: number;
      spent: number;
      health: "under" | "near" | "over";
    };
    const rows: CampRow[] = [];
    for (const camp of source.campaigns) {
      const budget = num(camp.campaign_budget);
      if (budget <= 0) continue;
      const spent = costsByCamp.get(camp.id) ?? 0;
      const health = budgetHealth(budget, spent);
      if (health === "unknown") continue;
      rows.push({
        name: camp.campaign_name,
        budget,
        spent,
        health,
      });
    }
    const buckets: {
      key: string;
      color: string;
      health: CampRow["health"];
    }[] = [
      { key: "Under budget", color: "#22c55e", health: "under" },
      { key: "Near limit", color: "#eab308", health: "near" },
      { key: "Over budget", color: "#f43f5e", health: "over" },
    ];
    const total = rows.length;
    return buckets
      .map((b) => {
        const list = rows.filter((r) => r.health === b.health);
        if (list.length === 0) return null;
        const budgetSum = list.reduce((s, r) => s + r.budget, 0);
        const spentSum = list.reduce((s, r) => s + r.spent, 0);
        const largest = [...list].sort((a, c) => c.spent - a.spent)[0];
        return {
          key: b.key,
          name: b.key,
          value: list.length,
          count: list.length,
          share: total > 0 ? (list.length / total) * 100 : null,
          color: b.color,
          insights: [
            { label: "Total Budget", value: money(budgetSum) },
            { label: "Total Spent", value: money(spentSum) },
            {
              label: "Largest by Spend",
              value: largest?.name ?? "Not available",
            },
          ],
        } satisfies DonutBreakdownSlice;
      })
      .filter((s): s is NonNullable<typeof s> => s != null);
  }, [source.campaigns, costsByCamp]);

  const trackTotal = onTrackSlices.reduce((s, d) => s + d.value, 0);
  const onTrackCount =
    onTrackSlices.find((s) => s.key === "On track")?.value ?? 0;
  const trackHealthy =
    trackTotal > 0 ? Math.round((onTrackCount / trackTotal) * 100) : 0;
  const budgetTotal = onBudgetSlices.reduce((s, d) => s + d.value, 0);
  const budgetHealthyCount = onBudgetSlices
    .filter((s) => s.key === "Under budget" || s.key === "Near limit")
    .reduce((s, d) => s + d.value, 0);
  const budgetHealthy =
    budgetTotal > 0 ? Math.round((budgetHealthyCount / budgetTotal) * 100) : 0;

  const attention = (
    isAm
      ? [
          source.pendingApprovals > 0
            ? {
                label: `${source.pendingApprovals} pending approval${source.pendingApprovals === 1 ? "" : "s"}`,
                href: "/app/approvals",
              }
            : null,
          source.overdueTasksOnBook > 0
            ? {
                label: `${source.overdueTasksOnBook} overdue task${source.overdueTasksOnBook === 1 ? "" : "s"} on your book`,
                href: "/app/tasks",
              }
            : null,
          campsOver > 0
            ? {
                label: `${campsOver} campaign${campsOver === 1 ? "" : "s"} over budget`,
                href: p("/app/campaigns"),
              }
            : null,
          overdueCount > 0
            ? {
                label: `${overdueCount} overdue invoice${overdueCount === 1 ? "" : "s"}`,
                href: "/app/alerts",
              }
            : null,
        ]
      : [
          source.openExceptions > 0
            ? {
                label: `${source.openExceptions} open exception${source.openExceptions === 1 ? "" : "s"}`,
                href: "/app/controls",
              }
            : null,
          overdueCount > 0
            ? {
                label: `${overdueCount} overdue invoice${overdueCount === 1 ? "" : "s"}`,
                href: "/app/ar",
              }
            : null,
          campsOver > 0
            ? {
                label: `${campsOver} campaign${campsOver === 1 ? "" : "s"} over budget`,
                href: p("/app/campaigns"),
              }
            : null,
          tasksAtRisk > 0
            ? {
                label: `${tasksAtRisk} overdue task${tasksAtRisk === 1 ? "" : "s"} across staff`,
                href: "/app/employees",
              }
            : null,
        ]
  ).filter(Boolean) as { label: string; href: string }[];

  const deliveryLinks = [
    {
      label: "Approvals",
      href: "/app/approvals",
      hint:
        source.pendingApprovals > 0
          ? `${source.pendingApprovals} pending`
          : "Client sign-off",
      tone: source.pendingApprovals > 0 ? ("warn" as const) : undefined,
    },
    {
      label: "My Tasks",
      href: "/app/tasks",
      hint:
        source.overdueTasksOnBook > 0
          ? `${source.overdueTasksOnBook} overdue`
          : `${source.openTasksOnBook} open`,
      tone: source.overdueTasksOnBook > 0 ? ("warn" as const) : undefined,
    },
    {
      label: "Time & PTO",
      href: "/app/work",
      hint: "Log hours",
    },
    {
      label: "Costs",
      href: "/app/costs",
      hint: "Campaign spend",
    },
  ];

  function renderAgencySection(id: AgencyPortfolioSectionId) {
    switch (id) {
      case "kpis":
        return (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Open exceptions"
              value={String(source.openExceptions)}
              hint="Controls"
              tone={source.openExceptions > 0 ? "bad" : "good"}
              href="/app/controls"
            />
            <StatCard
              label="AR"
              value={money(ar)}
              hint="Accounts receivable"
              tone={overdueCount > 0 ? "warn" : undefined}
              href="/app/ar"
            />
            <StatCard
              label="Overdue invoices"
              value={String(overdueCount)}
              hint={`${outstandingCount} open total`}
              tone={overdueCount > 0 ? "bad" : "good"}
              href="/app/ar"
            />
            <StatCard
              label="Campaigns over budget"
              value={String(campsOver)}
              tone={campsOver > 0 ? "bad" : "good"}
              href={p("/app/campaigns")}
            />
            <StatCard
              label="Firm margin"
              value={pct(margin)}
              hint={range.label}
              href={p("/app/profitability")}
            />
          </div>
        );
      case "firm_metrics":
        return (
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Revenue"
              value={money(revenue)}
              hint={range.label}
              href="/app/accounting"
            />
            <StatCard
              label="Profit"
              value={money(profit)}
              tone={profit >= 0 ? "good" : "bad"}
              hint={range.label}
              href={p("/app/profitability")}
            />
            <StatCard
              label="Open invoices"
              value={String(outstandingCount)}
              href="/app/billing"
            />
          </div>
        );
      case "profit_charts":
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <ClientProfitChart
                title="Profitability by customer"
                compact
                filterable
                href={p("/app/profitability")}
                data={byClient.map((r) => ({
                  name: r.name,
                  revenue: r.revenue,
                  costs: r.costs,
                  profit: r.profit,
                }))}
              />
            </div>
            <Link
              href={p("/app/profitability")}
              className="block min-w-0 transition hover:opacity-95"
            >
              <MonthlySeriesChart
                title="Gross profit"
                data={profitSeries}
                dataKey="profit"
                color="#4ade80"
              />
            </Link>
          </div>
        );
      case "health_charts":
        return (
          <div className="space-y-4">
            <EmployeeTrackChart
              slices={onTrackSlices}
              subtitle={trackTotal > 0 ? `${trackHealthy}% on track` : undefined}
            />
            <EmployeeBudgetChart
              slices={onBudgetSlices}
              subtitle={
                budgetTotal > 0 ? `${budgetHealthy}% healthy` : undefined
              }
            />
            <div className="text-right">
              <Link href={p("/app/campaigns")} className="link link-primary text-sm">
                View campaigns
              </Link>
            </div>
          </div>
        );
      case "team_capacity":
        return (
          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Team capacity</h2>
                <p className="text-xs opacity-60">
                  Open and overdue tasks by person — who is stretched
                </p>
              </div>
              <Link href="/app/employees" className="link link-primary text-sm">
                Employees
              </Link>
            </div>
            <div className="overflow-x-auto rounded-box border border-base-300/80">
              <table className="table table-sm">
                <thead className="sticky top-0 z-10 bg-base-100">
                  <tr>
                    <th>Person</th>
                    <th className="text-right">Open tasks</th>
                    <th className="text-right">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {capacityRows.slice(0, 8).map((r) => (
                    <tr key={r.id} className="hover">
                      <td className="font-medium">{r.name}</td>
                      <td className="text-right">{r.open}</td>
                      <td
                        className={`text-right ${r.overdue > 0 ? "text-error font-medium" : ""}`}
                      >
                        {r.overdue}
                      </td>
                    </tr>
                  ))}
                  {!capacityRows.length ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-6 text-center text-sm opacity-60"
                      >
                        No open staff tasks to show.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        );
      default:
        return null;
    }
  }

  function renderAmSection(id: AmPortfolioSectionId) {
    switch (id) {
      case "delivery":
        return (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
              Delivery today
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {deliveryLinks.map((d) => (
                <Link
                  key={d.href}
                  href={d.href}
                  className="rounded-box border border-base-300 bg-base-100 px-4 py-3 transition hover:border-primary/40 hover:bg-base-200/40"
                >
                  <div className="font-semibold">{d.label}</div>
                  <div
                    className={`text-sm ${d.tone === "warn" ? "text-warning" : "opacity-60"}`}
                  >
                    {d.hint}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      case "kpis":
        return (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Pending approvals"
              value={String(source.pendingApprovals)}
              hint="Needs decision"
              tone={source.pendingApprovals > 0 ? "warn" : "good"}
              href="/app/approvals"
            />
            <StatCard
              label="Clients"
              value={String(source.clients.length)}
              hint="In your book"
              href={p("/app/clients")}
            />
            <StatCard
              label="Campaigns at risk"
              value={String(campsOver)}
              hint="Over budget"
              tone={campsOver > 0 ? "bad" : "good"}
              href={p("/app/campaigns")}
            />
            <StatCard
              label="Book revenue"
              value={money(revenue)}
              hint={range.label}
              href={p("/app/profitability")}
            />
            <StatCard
              label="Book margin"
              value={pct(margin)}
              href={p("/app/profitability")}
            />
          </div>
        );
      case "profit_charts":
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <ClientProfitChart
                title="Profit by client (your book)"
                compact
                filterable
                href={p("/app/profitability")}
                data={byClient.map((r) => ({
                  name: r.name,
                  revenue: r.revenue,
                  costs: r.costs,
                  profit: r.profit,
                }))}
              />
            </div>
            <Link
              href={p("/app/profitability")}
              className="block min-w-0 transition hover:opacity-95"
            >
              <MonthlySeriesChart
                title="Gross profit"
                data={profitSeries}
                dataKey="profit"
                color="#4ade80"
              />
            </Link>
          </div>
        );
      case "budget_chart":
        return (
          <div className="space-y-2">
            <EmployeeBudgetChart
              slices={onBudgetSlices}
              subtitle={
                budgetTotal > 0 ? `${budgetHealthy}% healthy` : undefined
              }
            />
            <div className="text-right">
              <Link href={p("/app/campaigns")} className="link link-primary text-sm">
                View campaigns
              </Link>
            </div>
          </div>
        );
      case "my_clients":
        return (
          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">My Clients</h2>
                <p className="text-xs opacity-60">
                  Open a client hub for campaigns, approvals, and costs
                </p>
              </div>
              <Link
                href={p("/app/clients")}
                className="link link-primary text-sm"
              >
                View all
              </Link>
            </div>
            <div className="overflow-x-auto rounded-box border border-base-300/80">
              <table className="table table-sm">
                <thead className="sticky top-0 z-10 bg-base-100">
                  <tr>
                    <th>Client</th>
                    <th className="text-right">Revenue</th>
                    <th className="text-right">Profit</th>
                    <th className="text-right">Margin</th>
                    <th>Status</th>
                    <th>Hub</th>
                  </tr>
                </thead>
                <tbody>
                  {byClient.slice(0, 5).map((r) => (
                    <tr key={r.clientId} className="hover">
                      <td>
                        <Link
                          href={`/app/clients/${r.clientId}`}
                          className="link link-hover font-medium"
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="text-right">{money(r.revenue)}</td>
                      <td
                        className={`text-right ${r.profit < 0 ? "text-error" : ""}`}
                      >
                        {money(r.profit)}
                      </td>
                      <td className="text-right">{pct(r.margin)}</td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Link
                            href={`/app/campaigns?client=${r.clientId}`}
                            className="link link-hover opacity-70"
                          >
                            Campaigns
                          </Link>
                          <Link
                            href={`/app/approvals?client=${r.clientId}`}
                            className="link link-hover opacity-70"
                          >
                            Approvals
                          </Link>
                          <Link
                            href={`/app/costs?client=${r.clientId}`}
                            className="link link-hover opacity-70"
                          >
                            Costs
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!byClient.length ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-sm opacity-60"
                      >
                        No client activity in this period.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isAm ? "My portfolio" : "Executive overview"}
          </h1>
          <p className="mt-1 text-sm opacity-70">
            {isAm
              ? `What needs you today · ${source.fullName} · ${source.clients.length} client${source.clients.length === 1 ? "" : "s"}`
              : `Where the business is unhealthy · ${source.fullName}`}
          </p>
          <p className="text-xs opacity-50">
            Figures use {range.label}
            {range.start || range.end
              ? ` (${range.start ?? "…"} → ${range.end ?? "…"})`
              : ""}
            {isAm ? "." : ". AR is current open balance."}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <CustomizeLayoutButton onClick={() => layout.setPanelOpen(true)} />
          <label className="form-control w-full min-w-0 max-w-xs">
            <span className="label-text text-xs opacity-70">Time period</span>
            <select
              className="select select-bordered select-sm w-full max-w-full"
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodKey)}
            >
              {DASH_PERIODS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {attention.length ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-base-300 pb-4 text-sm">
          <span className="font-medium opacity-70">Needs attention</span>
          {attention.map((a) => (
            <Link
              key={a.href + a.label}
              href={a.href}
              className="link link-hover text-error/90"
            >
              {a.label}
            </Link>
          ))}
          <Link href="/app/alerts" className="link link-hover text-sm opacity-60">
            All alerts
          </Link>
        </div>
      ) : (
        <p className="border-b border-base-300 pb-4 text-sm opacity-60">
          {isAm
            ? "Nothing urgent on your book right now."
            : "No urgent exceptions right now."}{" "}
          <Link href="/app/alerts" className="link link-hover">
            View alerts
          </Link>
        </p>
      )}

      {layout.visible.length === 0 ? (
        <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 p-10 text-center">
          <p className="font-semibold">All sections are hidden</p>
          <p className="mt-1 text-sm opacity-60">
            Use Customize layout to show dashboard sections again.
          </p>
          <CustomizeLayoutButton
            className="btn btn-primary btn-sm mt-4 gap-2"
            onClick={() => layout.setPanelOpen(true)}
          />
        </div>
      ) : isAm ? (
        (layout.visible as AmPortfolioSectionId[]).map((id) => (
          <div key={id}>{renderAmSection(id)}</div>
        ))
      ) : (
        (layout.visible as AgencyPortfolioSectionId[]).map((id) => (
          <div key={id}>{renderAgencySection(id)}</div>
        ))
      )}

      {layout.panelOpen ? (
        isAm ? (
          <DashboardCustomizePanel
            prefs={amLayout.prefs}
            sections={AM_PORTFOLIO_SECTIONS}
            onClose={() => amLayout.setPanelOpen(false)}
            onToggle={amLayout.toggleHidden}
            onMove={amLayout.move}
            onRestore={amLayout.restoreDefaults}
          />
        ) : (
          <DashboardCustomizePanel
            prefs={agencyLayout.prefs}
            sections={AGENCY_PORTFOLIO_SECTIONS}
            onClose={() => agencyLayout.setPanelOpen(false)}
            onToggle={agencyLayout.toggleHidden}
            onMove={agencyLayout.move}
            onRestore={agencyLayout.restoreDefaults}
          />
        )
      ) : null}
    </div>
  );
}

/** @deprecated Prefer PortfolioDashboardClient */
export function AgencyDashboardClient({
  source,
  userId,
}: {
  source: PortfolioDashboardSource;
  userId: string;
}) {
  return (
    <PortfolioDashboardClient
      source={source}
      variant="agency"
      userId={userId}
    />
  );
}
