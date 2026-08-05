"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ClientProfitChart,
  EmployeeBudgetChart,
  EmployeeTrackChart,
  MonthlySeriesChart,
} from "@/components/Charts";
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

export type PortfolioDashboardSource = {
  fullName: string;
  openExceptions: number;
  pendingApprovals: number;
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
}: {
  source: PortfolioDashboardSource;
  variant?: PortfolioDashboardVariant;
}) {
  const isAm = variant === "account_manager";
  const [period, setPeriod] = useState<PeriodKey>("ytd");
  const range = useMemo(() => resolvePeriod(period, "", ""), [period]);

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

  // Budget health across all campaigns in scope (portfolio or agency)
  let campsUnder = 0;
  let campsNear = 0;
  let campsOver = 0;
  for (const camp of source.campaigns) {
    const budget = num(camp.campaign_budget);
    if (budget <= 0) continue;
    const health = budgetHealth(budget, costsByCamp.get(camp.id) ?? 0);
    if (health === "over") campsOver++;
    else if (health === "near") campsNear++;
    else campsUnder++;
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

  let tasksOnTrack = 0;
  let tasksAtRisk = 0;
  if (!isAm) {
    for (const p of staff) {
      for (const t of tasksByUser.get(p.id) ?? []) {
        const ok =
          t.status === "Completed" || !t.due_date || t.due_date >= today;
        if (ok) tasksOnTrack++;
        else tasksAtRisk++;
      }
    }
  }

  const onTrackData = [
    { name: "On track", value: tasksOnTrack, fill: "#22c55e" },
    { name: "At risk / overdue", value: tasksAtRisk, fill: "#f43f5e" },
  ].filter((d) => d.value > 0);

  const onBudgetData = [
    { name: "Under budget", value: campsUnder, fill: "#22c55e" },
    { name: "Near limit", value: campsNear, fill: "#eab308" },
    { name: "Over budget", value: campsOver, fill: "#f43f5e" },
  ].filter((d) => d.value > 0);

  const attention = (
    isAm
      ? [
          overdueCount > 0
            ? {
                label: `${overdueCount} overdue invoice${overdueCount === 1 ? "" : "s"}`,
                href: "/app/alerts",
              }
            : null,
          campsOver > 0
            ? {
                label: `${campsOver} campaign${campsOver === 1 ? "" : "s"} over budget`,
                href: "/app/campaigns",
              }
            : null,
          source.pendingApprovals > 0
            ? {
                label: `${source.pendingApprovals} pending approval${source.pendingApprovals === 1 ? "" : "s"}`,
                href: "/app/approvals",
              }
            : null,
        ]
      : [
          overdueCount > 0
            ? {
                label: `${overdueCount} overdue invoice${overdueCount === 1 ? "" : "s"}`,
                href: "/app/ar",
              }
            : null,
          campsOver > 0
            ? {
                label: `${campsOver} campaign${campsOver === 1 ? "" : "s"} over budget`,
                href: "/app/campaigns",
              }
            : null,
          source.openExceptions > 0
            ? {
                label: `${source.openExceptions} open exception${source.openExceptions === 1 ? "" : "s"}`,
                href: "/app/controls",
              }
            : null,
        ]
  ).filter(Boolean) as { label: string; href: string }[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm opacity-70">
            {isAm
              ? `Portfolio view · ${source.fullName} · ${source.clients.length} client${source.clients.length === 1 ? "" : "s"}`
              : `Agency-wide view · ${source.fullName}`}
          </p>
          <p className="text-xs opacity-50">
            Figures use {range.label}
            {range.start || range.end
              ? ` (${range.start ?? "…"} → ${range.end ?? "…"})`
              : ""}
            {isAm
              ? "."
              : ". AR is current open balance."}
          </p>
        </div>
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
        </div>
      ) : (
        <p className="border-b border-base-300 pb-4 text-sm opacity-60">
          No urgent exceptions right now.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {isAm ? (
          <>
            <StatCard
              label="Revenue"
              value={money(revenue)}
              hint={range.label}
              href="/app/profitability"
            />
            <StatCard
              label="Profit"
              value={money(profit)}
              tone={profit >= 0 ? "good" : "bad"}
              hint={range.label}
              href="/app/profitability"
            />
            <StatCard
              label="Margin"
              value={pct(margin)}
              href="/app/profitability"
            />
            <StatCard
              label="Clients"
              value={String(source.clients.length)}
              hint="In your portfolio"
              href="/app/clients"
            />
            <StatCard
              label="Campaigns at risk"
              value={String(campsOver)}
              hint="Over budget"
              tone={campsOver > 0 ? "bad" : "good"}
              href="/app/campaigns"
            />
          </>
        ) : (
          <>
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
              href="/app/profitability"
            />
            <StatCard
              label="Margin"
              value={pct(margin)}
              href="/app/profitability"
            />
            <StatCard
              label="AR"
              value={money(ar)}
              hint="Accounts receivable"
              href="/app/ar"
            />
            <StatCard
              label="Open invoices"
              value={String(outstandingCount)}
              href="/app/ar"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/app/profitability"
          className="block min-w-0 transition hover:opacity-95"
        >
          <ClientProfitChart
            title="Profitability by customer"
            compact
            data={byClient.slice(0, 8).map((r) => ({
              name: r.name,
              revenue: r.revenue,
              costs: r.costs,
              profit: r.profit,
            }))}
          />
        </Link>
        <Link
          href="/app/profitability"
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

      {isAm ? (
        <Link
          href="/app/campaigns"
          className="block min-w-0 max-w-xl transition hover:opacity-95"
        >
          <EmployeeBudgetChart data={onBudgetData} />
        </Link>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <EmployeeTrackChart data={onTrackData} />
          <Link
            href="/app/campaigns"
            className="block min-w-0 transition hover:opacity-95"
          >
            <EmployeeBudgetChart data={onBudgetData} />
          </Link>
        </div>
      )}

      {isAm ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold">My Clients</h2>
            <Link href="/app/clients" className="link link-primary text-sm">
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
                  </tr>
                ))}
                {!byClient.length ? (
                  <tr>
                    <td
                      colSpan={5}
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
      ) : null}
    </div>
  );
}

/** @deprecated Prefer PortfolioDashboardClient */
export function AgencyDashboardClient({
  source,
}: {
  source: PortfolioDashboardSource;
}) {
  return (
    <PortfolioDashboardClient source={source} variant="agency" />
  );
}
