"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/Charts";
import { NamedBarChart } from "@/components/tasks/NamedBarChart";
import { FitBadge, StatCard } from "@/components/ui";
import { money, num, pct } from "@/lib/format";
import {
  aggregateCampaignMetrics,
  computeCtr,
  computeRoas,
  revenueByCampaign,
} from "@/lib/metrics";
import {
  PERIOD_OPTIONS,
  inPeriod,
  resolvePeriod,
  type PeriodKey,
} from "@/lib/period";

export type AnalyticsSource = {
  profiles: {
    id: string;
    full_name: string;
    role: string;
    department: string | null;
  }[];
  campaigns: {
    id: string;
    campaign_name: string;
    client_id: string;
    clients?: { client_name: string } | null;
  }[];
  metrics: {
    campaign_id: string;
    metric_date: string;
    impressions: number | string;
    clicks: number | string;
    conversions: number | string;
    spend: number | string;
  }[];
  invoices: {
    client_id: string;
    campaign_id: string | null;
    total_amount: number | string;
    status: string;
    invoice_date: string;
  }[];
  assignments: { user_id: string; campaign_id: string }[];
  work: {
    user_id: string;
    campaign_id: string;
    hours: number | string;
    work_date: string;
  }[];
  tasks: {
    assignee_id: string | null;
    status: string;
    due_date: string | null;
    campaign_id: string | null;
  }[];
};

const DASH_PERIODS = PERIOD_OPTIONS.filter((o) => o.value !== "custom");

function cpc(spend: number, clicks: number) {
  if (clicks <= 0) return null;
  return spend / clicks;
}

function cpa(spend: number, conversions: number) {
  if (conversions <= 0) return null;
  return spend / conversions;
}

type EmployeeRow = {
  id: string;
  name: string;
  role: string;
  department: string;
  campaigns: number;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  hours: number;
  tasksDone: number;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
};

export function AnalyticsExplorer({ source }: { source: AnalyticsSource }) {
  const [period, setPeriod] = useState<PeriodKey>("ytd");
  const [sortKey, setSortKey] = useState<
    "clicks" | "impressions" | "conversions" | "hours" | "name"
  >("clicks");
  const range = useMemo(() => resolvePeriod(period, "", ""), [period]);

  const periodMetrics = useMemo(
    () =>
      source.metrics.filter((m) =>
        inPeriod(m.metric_date, range.start, range.end),
      ),
    [source.metrics, range.start, range.end],
  );

  const periodInvoices = useMemo(
    () =>
      source.invoices.filter(
        (i) =>
          !["Draft", "Canceled"].includes(i.status) &&
          inPeriod(i.invoice_date, range.start, range.end),
      ),
    [source.invoices, range.start, range.end],
  );

  const agencyAgg = useMemo(
    () => aggregateCampaignMetrics(periodMetrics),
    [periodMetrics],
  );

  const campaignRevenue = useMemo(
    () => revenueByCampaign(periodInvoices),
    [periodInvoices],
  );

  const attributedRevenue = useMemo(() => {
    let total = 0;
    for (const [, rev] of campaignRevenue) total += rev;
    return total;
  }, [campaignRevenue]);

  const agencyRoas = computeRoas(attributedRevenue, agencyAgg.spend);
  const agencyCpc = cpc(agencyAgg.spend, agencyAgg.clicks);
  const agencyCpa = cpa(agencyAgg.spend, agencyAgg.conversions);

  const assigneesByCampaign = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const a of source.assignments) {
      const list = map.get(a.campaign_id) ?? [];
      list.push(a.user_id);
      map.set(a.campaign_id, list);
    }
    return map;
  }, [source.assignments]);

  const metricsByCampaign = useMemo(() => {
    const map = new Map<
      string,
      ReturnType<typeof aggregateCampaignMetrics>
    >();
    const byId = new Map<string, typeof periodMetrics>();
    for (const m of periodMetrics) {
      const list = byId.get(m.campaign_id) ?? [];
      list.push(m);
      byId.set(m.campaign_id, list);
    }
    for (const [id, rows] of byId) {
      map.set(id, aggregateCampaignMetrics(rows));
    }
    return map;
  }, [periodMetrics]);

  const employeeRows = useMemo(() => {
    const staff = source.profiles.filter((p) => p.role !== "client");

    const workersByCampaign = new Map<string, Set<string>>();
    for (const w of source.work) {
      if (!inPeriod(w.work_date, range.start, range.end)) continue;
      const set = workersByCampaign.get(w.campaign_id) ?? new Set();
      set.add(w.user_id);
      workersByCampaign.set(w.campaign_id, set);
    }

    const rows: EmployeeRow[] = staff.map((p) => {
      const assigned = source.assignments
        .filter((a) => a.user_id === p.id)
        .map((a) => a.campaign_id);
      const campSet = new Set(assigned);

      for (const w of source.work) {
        if (
          w.user_id === p.id &&
          inPeriod(w.work_date, range.start, range.end)
        ) {
          campSet.add(w.campaign_id);
        }
      }

      let impressions = 0;
      let clicks = 0;
      let conversions = 0;
      let spend = 0;
      for (const campId of campSet) {
        const agg = metricsByCampaign.get(campId);
        if (!agg) continue;
        const assignees = assigneesByCampaign.get(campId) ?? [];
        let share = 0;
        if (assignees.includes(p.id)) {
          share = 1 / Math.max(1, assignees.length);
        } else if (assignees.length === 0) {
          const workers = workersByCampaign.get(campId);
          if (workers?.has(p.id)) {
            share = 1 / Math.max(1, workers.size);
          }
        }
        if (share <= 0) continue;
        impressions += agg.impressions * share;
        clicks += agg.clicks * share;
        conversions += agg.conversions * share;
        spend += agg.spend * share;
      }

      const hours = source.work
        .filter(
          (w) =>
            w.user_id === p.id &&
            inPeriod(w.work_date, range.start, range.end),
        )
        .reduce((s, w) => s + num(w.hours), 0);

      const tasksDone = source.tasks.filter(
        (t) =>
          t.assignee_id === p.id &&
          t.status === "Completed" &&
          (!t.due_date || inPeriod(t.due_date, range.start, range.end)),
      ).length;

      return {
        id: p.id,
        name: p.full_name,
        role: p.role,
        department: p.department || "—",
        campaigns: campSet.size,
        impressions: Math.round(impressions),
        clicks: Math.round(clicks),
        conversions: Math.round(conversions * 10) / 10,
        spend,
        hours,
        tasksDone,
        ctr: computeCtr(clicks, impressions),
        cpc: cpc(spend, clicks),
        cpa: cpa(spend, conversions),
      };
    });

    return rows.filter(
      (r) =>
        r.impressions > 0 ||
        r.clicks > 0 ||
        r.hours > 0 ||
        r.campaigns > 0 ||
        r.tasksDone > 0,
    );
  }, [
    source,
    range.start,
    range.end,
    metricsByCampaign,
    assigneesByCampaign,
  ]);

  const sortedEmployees = useMemo(() => {
    const list = [...employeeRows];
    list.sort((a, b) => {
      switch (sortKey) {
        case "impressions":
          return b.impressions - a.impressions;
        case "conversions":
          return b.conversions - a.conversions;
        case "hours":
          return b.hours - a.hours;
        case "name":
          return a.name.localeCompare(b.name);
        case "clicks":
        default:
          return b.clicks - a.clicks;
      }
    });
    return list;
  }, [employeeRows, sortKey]);

  const clicksByEmployee = sortedEmployees.slice(0, 10).map((r) => ({
    name: r.name.split(" ")[0] ?? r.name,
    value: r.clicks,
  }));

  const impressionsByEmployee = sortedEmployees.slice(0, 10).map((r) => ({
    name: r.name.split(" ")[0] ?? r.name,
    impressions: r.impressions,
    clicks: r.clicks,
  }));

  const campaignBars = useMemo(() => {
    return source.campaigns
      .map((c) => {
        const agg = metricsByCampaign.get(c.id);
        if (!agg) return null;
        return {
          name: c.campaign_name,
          value: agg.clicks,
          impressions: agg.impressions,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b!.value as number) - (a!.value as number))
      .slice(0, 12) as { name: string; value: number }[];
  }, [source.campaigns, metricsByCampaign]);

  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { impressions: number; clicks: number }>();
    for (const m of periodMetrics) {
      if (!m.metric_date) continue;
      const key = m.metric_date.slice(0, 7);
      const cur = map.get(key) ?? { impressions: 0, clicks: 0 };
      cur.impressions += num(m.impressions);
      cur.clicks += num(m.clicks);
      map.set(key, cur);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        impressions: v.impressions,
        clicks: v.clicks,
        ctr: computeCtr(v.clicks, v.impressions) ?? 0,
      }));
  }, [periodMetrics]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm opacity-70">
            Agency delivery and paid media performance
          </p>
          <p className="text-xs opacity-50">
            Period: {range.label}
            {range.start || range.end
              ? ` (${range.start ?? "…"} → ${range.end ?? "…"})`
              : ""}
            . Campaign metrics are split evenly across assigned employees.
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Agency overview</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Impressions"
            value={agencyAgg.impressions.toLocaleString()}
            hint={range.label}
          />
          <StatCard
            label="Clicks"
            value={agencyAgg.clicks.toLocaleString()}
            hint={range.label}
          />
          <StatCard
            label="CTR"
            value={pct(agencyAgg.ctr)}
            hint={`${agencyAgg.clicks.toLocaleString()} / ${agencyAgg.impressions.toLocaleString()}`}
          />
          <StatCard
            label="Conversions"
            value={agencyAgg.conversions.toLocaleString()}
          />
          <StatCard
            label="Ad spend"
            value={money(agencyAgg.spend)}
            hint={range.label}
          />
          <StatCard
            label="CPC"
            value={agencyCpc != null ? money(agencyCpc) : "—"}
            hint="Cost per click"
          />
          <StatCard
            label="CPA"
            value={agencyCpa != null ? money(agencyCpa) : "—"}
            hint="Cost per acquisition"
          />
          <StatCard
            label="ROAS"
            value={
              agencyRoas != null ? `${agencyRoas.toFixed(2)}x` : "—"
            }
            hint={`Revenue ${money(attributedRevenue)}`}
            tone={
              agencyRoas == null
                ? "neutral"
                : agencyRoas >= 1
                  ? "good"
                  : "bad"
            }
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <NamedBarChart
          title="Clicks by campaign"
          data={campaignBars}
          color="#0ea5e9"
        />
        <ChartCard title="Impressions & clicks trend" empty={!monthlyTrend.length}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={48} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="impressions"
                name="Impressions"
                fill="#94a3b8"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="clicks"
                name="Clicks"
                fill="#0ea5e9"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <NamedBarChart
          title="Clicks by employee"
          data={clicksByEmployee}
          color="#16375f"
        />
        <ChartCard
          title="Impressions vs clicks by employee"
          empty={!impressionsByEmployee.length}
          compact
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={impressionsByEmployee}
              layout="vertical"
              margin={{ left: 8, right: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={72}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="impressions" name="Impressions" fill="#94a3b8" />
              <Bar dataKey="clicks" name="Clicks" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Employee performance</h2>
            <p className="text-xs opacity-60">
              Media metrics credited from assigned campaigns; hours from work
              logs.
            </p>
          </div>
          <label className="form-control w-full max-w-[11rem]">
            <span className="label-text text-xs opacity-70">Sort by</span>
            <select
              className="select select-bordered select-sm w-full"
              value={sortKey}
              onChange={(e) =>
                setSortKey(
                  e.target.value as
                    | "clicks"
                    | "impressions"
                    | "conversions"
                    | "hours"
                    | "name",
                )
              }
            >
              <option value="clicks">Clicks ↓</option>
              <option value="impressions">Impressions ↓</option>
              <option value="conversions">Conversions ↓</option>
              <option value="hours">Hours ↓</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </label>
        </div>

        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table table-sm">
            <thead className="sticky top-0 z-10 bg-base-100">
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th className="text-right">Campaigns</th>
                <th className="text-right">Impressions</th>
                <th className="text-right">Clicks</th>
                <th className="text-right">CTR</th>
                <th className="text-right">Conv.</th>
                <th className="text-right">Spend</th>
                <th className="text-right">CPC</th>
                <th className="text-right">Hours</th>
                <th className="text-right">Tasks done</th>
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map((r) => (
                <tr key={r.id} className="hover">
                  <td>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs opacity-50">{r.department}</div>
                  </td>
                  <td>
                    <FitBadge className="badge-ghost badge-nowrap">
                      {r.role.replace(/_/g, " ")}
                    </FitBadge>
                  </td>
                  <td className="text-right">{r.campaigns}</td>
                  <td className="text-right">
                    {r.impressions.toLocaleString()}
                  </td>
                  <td className="text-right">{r.clicks.toLocaleString()}</td>
                  <td className="text-right">{pct(r.ctr)}</td>
                  <td className="text-right">
                    {r.conversions.toLocaleString()}
                  </td>
                  <td className="text-right">{money(r.spend)}</td>
                  <td className="text-right">
                    {r.cpc != null ? money(r.cpc) : "—"}
                  </td>
                  <td className="text-right">{r.hours.toFixed(1)}</td>
                  <td className="text-right">{r.tasksDone}</td>
                </tr>
              ))}
              {!sortedEmployees.length ? (
                <tr>
                  <td
                    colSpan={11}
                    className="py-8 text-center text-sm opacity-60"
                  >
                    No employee activity in this period.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
