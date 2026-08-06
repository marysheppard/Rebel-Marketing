"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from "recharts";
import { money } from "@/lib/format";
import {
  DonutBreakdownViz,
  buildCountDonutSlices,
  buildMoneyDonutSlices,
  type DonutBreakdownSlice,
} from "@/components/DonutBreakdownViz";

export type { DonutBreakdownSlice };

function formatAxisMoney(value: number) {
  const n = Number(value);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

function ProfitTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: {
    payload: {
      name: string;
      profit: number;
      revenue?: number;
      costs?: number;
      subtitle?: string;
    };
  }[];
}) {
  if (!active || !payload?.[0]) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm shadow-lg">
      <div className="font-semibold">{row.name}</div>
      {row.subtitle ? (
        <div className="text-xs opacity-60">{row.subtitle}</div>
      ) : null}
      <div>Profit: {money(row.profit)}</div>
      {row.revenue != null ? <div>Revenue: {money(row.revenue)}</div> : null}
      {row.costs != null ? <div>Costs: {money(row.costs)}</div> : null}
    </div>
  );
}

export function ChartCard({
  title,
  children,
  empty,
  compact,
}: {
  title: string;
  children: React.ReactNode;
  empty?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {empty ? (
        <div
          className={`flex items-center justify-center text-sm opacity-60 ${compact ? "h-40" : "h-56"}`}
        >
          Not enough data yet for this chart.
        </div>
      ) : (
        <div className={`w-full ${compact ? "h-48" : "h-64"}`}>{children}</div>
      )}
    </div>
  );
}

export function RevenueCostChart({
  data,
}: {
  data: { month: string; revenue: number; costs: number }[];
}) {
  return (
    <ChartCard title="Revenue vs Cost by Month" empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} />
          <Line type="monotone" dataKey="costs" stroke="#f97316" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ClientProfitChart({
  data,
  title = "Profitability by Client",
  compact = false,
  filterable = false,
  href,
  linkLabel = "View profitability",
}: {
  data: {
    name: string;
    revenue: number;
    costs: number;
    profit: number;
    subtitle?: string;
  }[];
  title?: string;
  compact?: boolean;
  /** Chart-local search / profit filter / sort (does not affect parent). */
  filterable?: boolean;
  href?: string;
  linkLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [profitFilter, setProfitFilter] = useState<
    "all" | "profitable" | "unprofitable"
  >("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const rows = useMemo(() => {
    let list = [...data];
    if (filterable) {
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        list = list.filter((r) => r.name.toLowerCase().includes(q));
      }
      if (profitFilter === "profitable") list = list.filter((r) => r.profit > 0);
      if (profitFilter === "unprofitable")
        list = list.filter((r) => r.profit <= 0);
      list.sort((a, b) =>
        sortDir === "asc" ? a.profit - b.profit : b.profit - a.profit,
      );
    }
    return list;
  }, [data, filterable, query, profitFilter, sortDir]);

  const rowPx = 30;
  const chartHeight = Math.max(
    compact ? 160 : 200,
    rows.length * rowPx + 24,
  );
  const viewportClass = compact ? "h-48" : "h-64";
  const yWidth = compact ? 88 : 112;

  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        {href ? (
          <Link href={href} className="link link-primary text-xs shrink-0">
            {linkLabel}
          </Link>
        ) : null}
      </div>

      {filterable ? (
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className="form-control min-w-0">
            <span className="label-text text-xs opacity-70">Search</span>
            <input
              className="input input-bordered input-sm w-full"
              placeholder="Customer name?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="form-control min-w-0">
            <span className="label-text text-xs opacity-70">Profit</span>
            <select
              className="select select-bordered select-sm w-full"
              value={profitFilter}
              onChange={(e) =>
                setProfitFilter(
                  e.target.value as "all" | "profitable" | "unprofitable",
                )
              }
            >
              <option value="all">All</option>
              <option value="profitable">Profitable</option>
              <option value="unprofitable">Unprofitable</option>
            </select>
          </label>
          <label className="form-control min-w-0">
            <span className="label-text text-xs opacity-70">Sort</span>
            <select
              className="select select-bordered select-sm w-full"
              value={sortDir}
              onChange={(e) =>
                setSortDir(e.target.value as "asc" | "desc")
              }
            >
              <option value="asc">Low ? high</option>
              <option value="desc">High ? low</option>
            </select>
          </label>
        </div>
      ) : null}

      {!data.length ? (
        <div
          className={`flex items-center justify-center text-sm opacity-60 ${viewportClass}`}
        >
          Not enough data yet for this chart.
        </div>
      ) : !rows.length ? (
        <div
          className={`flex items-center justify-center text-sm opacity-60 ${viewportClass}`}
        >
          No customers match these filters.
        </div>
      ) : (
        <div className={`w-full overflow-y-auto ${viewportClass}`}>
          <div style={{ height: chartHeight, minHeight: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ left: 8, right: 8, top: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  type="number"
                  tickFormatter={formatAxisMoney}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={yWidth}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<ProfitTooltip />} />
                <ReferenceLine x={0} stroke="currentColor" strokeOpacity={0.25} />
                <Bar dataKey="profit" fill="#4ade80" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export function BudgetActualChart({
  data,
}: {
  data: { name: string; budget: number; actual: number }[];
}) {
  return (
    <ChartCard title="Campaign Budget vs Actual Cost" empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="name" hide />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="budget" fill="#818cf8" />
          <Bar dataKey="actual" fill="#f43f5e" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function RevenueByTypeChart({
  data,
}: {
  data: { type: string; revenue: number }[];
}) {
  return (
    <ChartCard title="Revenue by Campaign Type" empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="type" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="revenue" fill="#14b8a6" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ArAgingChart({
  data,
}: {
  data: { bucket: string; amount: number }[];
}) {
  return (
    <ChartCard title="Accounts Receivable Aging" empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="bucket" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="amount" fill="#eab308" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function MarginChart({
  data,
}: {
  data: { name: string; margin: number }[];
}) {
  return (
    <ChartCard title="Campaign Profit Margin %" empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="name" hide />
          <YAxis />
          <Tooltip />
          <Bar dataKey="margin" fill="#a78bfa" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ClicksByCampaignChart({
  data,
}: {
  data: { name: string; clicks: number }[];
}) {
  return (
    <ChartCard title="Clicks by campaign" empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="name" hide />
          <YAxis />
          <Tooltip />
          <Bar dataKey="clicks" fill="#0ea5e9" name="Clicks" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ImpressionsClicksTrendChart({
  data,
}: {
  data: { date: string; impressions: number; clicks: number }[];
}) {
  return (
    <ChartCard title="Impressions vs clicks over time" empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="impressions"
            stroke="#94a3b8"
            strokeWidth={2}
            name="Impressions"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="clicks"
            stroke="#0284c7"
            strokeWidth={2}
            name="Clicks"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function CtrByCampaignChart({
  data,
}: {
  data: { name: string; ctr: number }[];
}) {
  return (
    <ChartCard title="CTR % by campaign" empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="name" hide />
          <YAxis unit="%" />
          <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, "CTR"]} />
          <Bar dataKey="ctr" fill="#14b8a6" name="CTR %" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

const APPROVAL_STATUS_COLORS: Record<string, string> = {
  Pending: "#f59e0b",
  "Changes Requested": "#f97316",
  Approved: "#22c55e",
  Rejected: "#ef4444",
};

function mostCommonLabel(labels: string[]): string | null {
  if (labels.length === 0) return null;
  const counts = new Map<string, number>();
  for (const label of labels) {
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [label, count] of counts) {
    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  }
  return best;
}

export function buildApprovalDonutSlices(
  items: {
    approval_status: string;
    waitingDays: number | null;
    client_name: string;
    campaign_name: string;
  }[],
): DonutBreakdownSlice[] {
  const byStatus = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.approval_status || "Unknown";
    const list = byStatus.get(key) ?? [];
    list.push(item);
    byStatus.set(key, list);
  }
  const total = items.length;
  return [...byStatus.entries()]
    .map(([status, rows]) => {
      const waits = rows
        .map((r) => r.waitingDays)
        .filter((d): d is number => d != null);
      const avgWait =
        waits.length > 0
          ? Math.round(waits.reduce((s, d) => s + d, 0) / waits.length)
          : null;
      const oldest = waits.length > 0 ? Math.max(...waits) : null;
      const overdue = waits.filter((d) => d >= 7).length;
      const topClient = mostCommonLabel(rows.map((r) => r.client_name));
      const topCampaign = mostCommonLabel(rows.map((r) => r.campaign_name));
      return {
        key: status,
        name: status,
        value: rows.length,
        count: rows.length,
        share: total > 0 ? (rows.length / total) * 100 : null,
        color: APPROVAL_STATUS_COLORS[status] ?? "#94a3b8",
        insights: [
          {
            label: "Avg Wait",
            value: avgWait == null ? "Not available" : `${avgWait}d`,
          },
          {
            label: "Oldest Wait",
            value: oldest == null ? "Not available" : `${oldest}d`,
          },
          {
            label: "Overdue (7+ days)",
            value: String(overdue),
          },
          {
            label: "Top Client",
            value: topClient ?? "Not available",
          },
          {
            label: "Top Campaign",
            value: topCampaign ?? "Not available",
          },
        ],
      } satisfies DonutBreakdownSlice;
    })
    .sort((a, b) => b.value - a.value);
}

export function ApprovalStatusPieChart({
  slices,
  selectedKey,
  onSelectKey,
  onClearSelection,
}: {
  slices: DonutBreakdownSlice[];
  selectedKey?: string | null;
  onSelectKey?: (key: string) => void;
  onClearSelection?: () => void;
}) {
  return (
    <DonutBreakdownViz
      title="Approvals by status"
      emptyMessage="No approvals to chart yet."
      slices={slices}
      valueFormat="count"
      centerTotalLabel="Total Approvals"
      valueColumnLabel="Count"
      categoryColumnLabel="Status"
      valueDetailLabel="Count"
      itemNoun="approvals"
      selectedKey={selectedKey}
      onSelectKey={onSelectKey}
      onClearSelection={onClearSelection}
    />
  );
}

export function ApprovalAgingBarChart({
  data,
}: {
  data: { bucket: string; count: number }[];
}) {
  const hasAny = data.some((d) => d.count > 0);
  return (
    <ChartCard title="Pending by wait time" empty={!hasAny}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="bucket" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#f59e0b" name="Pending" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  Active: "#22c55e",
  Late: "#ef4444",
  "On Hold": "#f59e0b",
  Completed: "#38bdf8",
  Canceled: "#94a3b8",
};

export function buildCampaignDonutSlices(
  items: {
    campaign_status: string;
    campaign_name: string;
    client_name: string;
    budget: number;
    spent: number;
    health: "over" | "near" | "under" | "unknown";
  }[],
): DonutBreakdownSlice[] {
  const byStatus = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.campaign_status || "Unknown";
    const list = byStatus.get(key) ?? [];
    list.push(item);
    byStatus.set(key, list);
  }
  const total = items.length;
  return [...byStatus.entries()]
    .map(([status, rows]) => {
      const budgetTotal = rows.reduce((s, r) => s + r.budget, 0);
      const spentTotal = rows.reduce((s, r) => s + r.spent, 0);
      const overBudget = rows.filter((r) => r.health === "over").length;
      const largest = [...rows].sort((a, b) => b.spent - a.spent)[0];
      const clients = new Set(rows.map((r) => r.client_name).filter(Boolean));
      return {
        key: status,
        name: status,
        value: rows.length,
        count: rows.length,
        share: total > 0 ? (rows.length / total) * 100 : null,
        color: CAMPAIGN_STATUS_COLORS[status] ?? "#94a3b8",
        insights: [
          {
            label: "Total Budget",
            value: budgetTotal > 0 ? money(budgetTotal) : "Not available",
          },
          {
            label: "Total Spent",
            value: money(spentTotal),
          },
          {
            label: "Over Budget",
            value: String(overBudget),
          },
          {
            label: "Largest by Spend",
            value: largest?.campaign_name ?? "Not available",
          },
          {
            label: "Clients",
            value: String(clients.size),
          },
        ],
      } satisfies DonutBreakdownSlice;
    })
    .sort((a, b) => b.value - a.value);
}

export function CampaignStatusPieChart({
  slices,
  selectedKey,
  onSelectKey,
  onClearSelection,
}: {
  slices: DonutBreakdownSlice[];
  selectedKey?: string | null;
  onSelectKey?: (key: string) => void;
  onClearSelection?: () => void;
}) {
  return (
    <DonutBreakdownViz
      title="Campaigns by status"
      emptyMessage="No campaigns to chart yet."
      slices={slices}
      valueFormat="count"
      centerTotalLabel="Total Campaigns"
      valueColumnLabel="Count"
      categoryColumnLabel="Status"
      valueDetailLabel="Count"
      itemNoun="campaigns"
      selectedKey={selectedKey}
      onSelectKey={onSelectKey}
      onClearSelection={onClearSelection}
    />
  );
}

const BUDGET_HEALTH_COLORS: Record<string, string> = {
  Under: "#22c55e",
  Near: "#f59e0b",
  Over: "#ef4444",
  "No budget": "#94a3b8",
};

export function CampaignBudgetHealthChart({
  data,
}: {
  data: { bucket: string; count: number }[];
}) {
  const hasAny = data.some((d) => d.count > 0);
  return (
    <ChartCard title="Budget health" empty={!hasAny}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="bucket" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" name="Campaigns">
            {data.map((entry) => (
              <Cell
                key={entry.bucket}
                fill={BUDGET_HEALTH_COLORS[entry.bucket] ?? "#94a3b8"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

const COST_TYPE_COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#a78bfa",
  "#ef4444",
  "#14b8a6",
  "#fb923c",
  "#94a3b8",
];

export function CostTypePieChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const filtered = data.filter((d) => d.value > 0);
  const total = filtered.reduce((sum, d) => sum + d.value, 0);
  const withPct = filtered.map((d) => ({
    ...d,
    pct: total > 0 ? Math.round((d.value / total) * 100) : 0,
  }));

  function formatMoney(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }

  return (
    <ChartCard title="Spend by type" empty={!withPct.length}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={withPct}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={80}
            paddingAngle={2}
          >
            {withPct.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={COST_TYPE_COLORS[i % COST_TYPE_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _name, item) => {
              const pct = item?.payload?.pct;
              const amount = formatMoney(Number(value));
              return [
                pct != null ? `${pct}% | ${amount}` : amount,
                "Spend",
              ];
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function CostByCampaignChart({
  data,
}: {
  data: { name: string; amount: number }[];
}) {
  function formatK(value: number) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "?";
    if (Math.abs(n) >= 1000) {
      const k = n / 1000;
      const rounded = Math.abs(k) >= 10 ? k.toFixed(0) : k.toFixed(1);
      return `$${rounded.replace(/\.0$/, "")}K`;
    }
    return `$${Math.round(n)}`;
  }

  function shortName(name: string) {
    const parts = name
      .trim()
      .split(/[\s\-_/]+/)
      .filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) {
      const word = parts[0]!;
      return word.slice(0, 3).toUpperCase();
    }
    return parts
      .slice(0, 3)
      .map((w) => w[0]!.toUpperCase())
      .join("");
  }

  const chartData = data.map((d) => ({
    ...d,
    shortName: shortName(d.name),
  }));

  return (
    <ChartCard title="Spend by campaign" empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 4, right: 12 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            type="number"
            tickFormatter={(v) => formatK(Number(v))}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            width={36}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value) => [formatK(Number(value)), "Spend"]}
            labelFormatter={(_, payload) => {
              const full = payload?.[0]?.payload?.name;
              return typeof full === "string" ? full : "";
            }}
          />
          <Bar dataKey="amount" fill="#0ea5e9" name="Spend" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

const TASK_STATUS_COLORS: Record<string, string> = {
  "Not Started": "#94a3b8",
  "In Progress": "#0ea5e9",
  Submitted: "#a78bfa",
  "Needs Revision": "#f59e0b",
  Approved: "#22c55e",
};

export function buildTaskDonutSlices(
  items: {
    status: string;
    priority: string;
    campaign_name: string;
    client_name: string;
    overdue: boolean;
  }[],
): DonutBreakdownSlice[] {
  const byStatus = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.status || "Unknown";
    const list = byStatus.get(key) ?? [];
    list.push(item);
    byStatus.set(key, list);
  }
  const total = items.length;
  return [...byStatus.entries()]
    .map(([status, rows]) => {
      const overdue = rows.filter((r) => r.overdue).length;
      const highPriority = rows.filter(
        (r) => r.priority === "Urgent" || r.priority === "High",
      ).length;
      const topCampaign = mostCommonLabel(rows.map((r) => r.campaign_name));
      const topClient = mostCommonLabel(rows.map((r) => r.client_name));
      return {
        key: status,
        name: status,
        value: rows.length,
        count: rows.length,
        share: total > 0 ? (rows.length / total) * 100 : null,
        color: TASK_STATUS_COLORS[status] ?? "#94a3b8",
        insights: [
          {
            label: "Overdue",
            value: String(overdue),
          },
          {
            label: "Urgent / High",
            value: String(highPriority),
          },
          {
            label: "Top Campaign",
            value: topCampaign ?? "Not available",
          },
          {
            label: "Top Client",
            value: topClient ?? "Not available",
          },
        ],
      } satisfies DonutBreakdownSlice;
    })
    .sort((a, b) => b.value - a.value);
}

export function TaskStatusPieChart({
  slices,
  selectedKey,
  onSelectKey,
  onClearSelection,
}: {
  slices: DonutBreakdownSlice[];
  selectedKey?: string | null;
  onSelectKey?: (key: string) => void;
  onClearSelection?: () => void;
}) {
  return (
    <DonutBreakdownViz
      title="Tasks by status"
      emptyMessage="No tasks to chart yet."
      slices={slices}
      valueFormat="count"
      centerTotalLabel="Total Tasks"
      valueColumnLabel="Count"
      categoryColumnLabel="Status"
      valueDetailLabel="Count"
      itemNoun="tasks"
      selectedKey={selectedKey}
      onSelectKey={onSelectKey}
      onClearSelection={onClearSelection}
    />
  );
}

const TASK_PRIORITY_COLORS: Record<string, string> = {
  Urgent: "#ef4444",
  High: "#f59e0b",
  Medium: "#0ea5e9",
  Low: "#94a3b8",
};

export function TaskPriorityBarChart({
  data,
}: {
  data: { priority: string; count: number }[];
}) {
  const hasAny = data.some((d) => d.count > 0);
  return (
    <ChartCard title="Tasks by priority" empty={!hasAny}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="priority" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" name="Tasks">
            {data.map((entry) => (
              <Cell
                key={entry.priority}
                fill={TASK_PRIORITY_COLORS[entry.priority] ?? "#94a3b8"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function NewClientsBarChart({
  data,
}: {
  data: { month: string; count: number }[];
}) {
  const hasAny = data.some((d) => d.count > 0);
  return (
    <ChartCard title="New clients by month" empty={!hasAny}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#22c55e" name="New clients" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

const STRATEGY_COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#a78bfa",
  "#ef4444",
  "#14b8a6",
  "#fb923c",
  "#94a3b8",
];

export function buildStrategyDonutSlices(
  rows: {
    type: string;
    spend: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpa: number;
    conversionsDeltaPct: number | null;
  }[],
): DonutBreakdownSlice[] {
  const withSpend = rows.filter((r) => r.spend > 0);
  const totalSpend = withSpend.reduce((s, r) => s + r.spend, 0);
  return withSpend
    .map((r, index) => {
      const delta =
        r.conversionsDeltaPct == null
          ? "Not available"
          : `${r.conversionsDeltaPct > 0 ? "+" : ""}${r.conversionsDeltaPct}%`;
      return {
        key: r.type,
        name: r.type,
        value: r.spend,
        count: 1,
        share: totalSpend > 0 ? (r.spend / totalSpend) * 100 : null,
        color: STRATEGY_COLORS[index % STRATEGY_COLORS.length],
        insights: [
          {
            label: "Clicks",
            value: r.clicks.toLocaleString(),
          },
          {
            label: "Conversions",
            value: r.conversions.toLocaleString(),
          },
          {
            label: "CTR",
            value: `${r.ctr}%`,
          },
          {
            label: "CPA",
            value: r.conversions > 0 ? money(r.cpa) : "Not available",
          },
          {
            label: "Conv. Δ (30d)",
            value: delta,
          },
        ],
      } satisfies DonutBreakdownSlice;
    })
    .sort((a, b) => b.value - a.value);
}

export function StrategySpendPieChart({
  slices,
  selectedKey,
  onSelectKey,
  onClearSelection,
}: {
  slices: DonutBreakdownSlice[];
  selectedKey?: string | null;
  onSelectKey?: (key: string) => void;
  onClearSelection?: () => void;
}) {
  return (
    <DonutBreakdownViz
      title="Spend by strategy"
      subtitle="Last 30 days"
      emptyMessage="No strategy spend to chart yet."
      slices={slices}
      valueFormat="money"
      centerTotalLabel="Total Spend"
      valueColumnLabel="Spend"
      countColumnLabel="Rows"
      categoryColumnLabel="Strategy"
      valueDetailLabel="Spend"
      countDetailLabel="Entries"
      itemNoun="strategies"
      selectedKey={selectedKey}
      onSelectKey={onSelectKey}
      onClearSelection={onClearSelection}
    />
  );
}

export function StrategyConversionsBarChart({
  data,
}: {
  data: { name: string; conversions: number }[];
}) {
  const hasAny = data.some((d) => d.conversions > 0);
  return (
    <ChartCard title="Conversions by strategy" empty={!hasAny}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="conversions" fill="#a78bfa" name="Conversions">
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={STRATEGY_COLORS[i % STRATEGY_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function MonthlySeriesChart({
  title,
  data,
  dataKey,
  color,
}: {
  title: string;
  data: { month: string; [key: string]: string | number }[];
  dataKey: string;
  color: string;
}) {
  return (
    <ChartCard title={title} empty={!data.length} compact>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={48} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function EmployeeTrackChart({
  slices,
  subtitle,
  selectedKey,
  onSelectKey,
  onClearSelection,
}: {
  slices: DonutBreakdownSlice[];
  subtitle?: string;
  selectedKey?: string | null;
  onSelectKey?: (key: string) => void;
  onClearSelection?: () => void;
}) {
  return (
    <DonutBreakdownViz
      title="Projects on track"
      subtitle={subtitle}
      emptyMessage="No project status to chart yet."
      slices={slices}
      valueFormat="count"
      centerTotalLabel="Total Projects"
      valueColumnLabel="Count"
      categoryColumnLabel="Status"
      valueDetailLabel="Count"
      itemNoun="projects"
      selectedKey={selectedKey}
      onSelectKey={onSelectKey}
      onClearSelection={onClearSelection}
    />
  );
}

export function EmployeeBudgetChart({
  slices,
  subtitle,
  selectedKey,
  onSelectKey,
  onClearSelection,
}: {
  slices: DonutBreakdownSlice[];
  subtitle?: string;
  selectedKey?: string | null;
  onSelectKey?: (key: string) => void;
  onClearSelection?: () => void;
}) {
  return (
    <DonutBreakdownViz
      title="Campaigns on budget"
      subtitle={subtitle}
      emptyMessage="No budget health to chart yet."
      slices={slices}
      valueFormat="count"
      centerTotalLabel="Total Campaigns"
      valueColumnLabel="Count"
      categoryColumnLabel="Status"
      valueDetailLabel="Count"
      itemNoun="campaigns"
      selectedKey={selectedKey}
      onSelectKey={onSelectKey}
      onClearSelection={onClearSelection}
    />
  );
}

export function EmployeePerformanceChart({
  data,
}: {
  data: { name: string; hours: number }[];
}) {
  return (
    <ChartCard title="Employee hours (30 days)" empty={!data.length} compact>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={88}
            tick={{ fontSize: 11 }}
          />
          <Tooltip />
          <Bar dataKey="hours" fill="#0ea5e9" name="Hours" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
