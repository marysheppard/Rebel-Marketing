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

function ApprovalStatusTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { name: string; value: number } }>;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const pct = total > 0 ? (row.value / total) * 100 : 0;
  return (
    <div className="rounded-box border border-base-300 bg-base-100 px-3 py-2 text-sm shadow-md">
      <div className="font-semibold">{row.name}</div>
      <div className="mt-0.5 opacity-70">
        {row.value} approval{row.value === 1 ? "" : "s"}
      </div>
      <div className="mt-0.5 tabular-nums">{pct.toFixed(1)}% of total</div>
    </div>
  );
}

export function ApprovalStatusPieChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const filtered = data.filter((d) => d.value > 0);
  const total = filtered.reduce((s, d) => s + d.value, 0);
  return (
    <ChartCard title="Approvals by status" empty={!filtered.length}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={filtered}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={80}
            paddingAngle={2}
          >
            {filtered.map((entry) => (
              <Cell
                key={entry.name}
                fill={APPROVAL_STATUS_COLORS[entry.name] ?? "#94a3b8"}
              />
            ))}
          </Pie>
          <Tooltip
            content={<ApprovalStatusTooltip total={total} />}
            cursor={{ fill: "transparent" }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
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

export function CampaignStatusPieChart({
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

  return (
    <ChartCard title="Campaigns by status" empty={!withPct.length}>
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
            {withPct.map((entry) => (
              <Cell
                key={entry.name}
                fill={CAMPAIGN_STATUS_COLORS[entry.name] ?? "#94a3b8"}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _name, item) => {
              const pct = item?.payload?.pct;
              return [
                pct != null ? `${pct}% | ${value}` : String(value),
                "Campaigns",
              ];
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
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

export function TaskStatusPieChart({
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

  return (
    <ChartCard title="Tasks by status" empty={!withPct.length}>
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
            {withPct.map((entry) => (
              <Cell
                key={entry.name}
                fill={TASK_STATUS_COLORS[entry.name] ?? "#94a3b8"}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _name, item) => {
              const pct = item?.payload?.pct;
              return [
                pct != null ? `${pct}% | ${value}` : String(value),
                "Tasks",
              ];
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
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

export function StrategySpendPieChart({
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

  return (
    <ChartCard title="Spend by strategy" empty={!withPct.length}>
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
                fill={STRATEGY_COLORS[i % STRATEGY_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _name, item) => {
              const pct = item?.payload?.pct;
              const amount = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }).format(Number(value));
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
  data,
}: {
  data: { name: string; value: number; fill: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const onTrack = data.find((d) => d.name === "On track")?.value ?? 0;
  const healthy = total > 0 ? Math.round((onTrack / total) * 100) : 0;

  return (
    <ChartCard title="Projects on track" empty={!total} compact>
      <div className="relative h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                `${Number(value)} tasks`,
                String(name),
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={28}
              formatter={(value) => (
                <span className="text-xs opacity-80">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
          <div className="text-2xl font-bold tabular-nums">{healthy}%</div>
          <div className="text-[10px] uppercase tracking-wide opacity-60">
            on track
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

export function EmployeeBudgetChart({
  data,
}: {
  data: { name: string; value: number; fill: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const under = data.find((d) => d.name === "Under budget")?.value ?? 0;
  const near = data.find((d) => d.name === "Near limit")?.value ?? 0;
  const healthy = total > 0 ? Math.round(((under + near) / total) * 100) : 0;

  return (
    <ChartCard title="Campaigns on budget" empty={!total} compact>
      <div className="relative h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                `${Number(value)} campaigns`,
                String(name),
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={28}
              formatter={(value) => (
                <span className="text-xs opacity-80">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
          <div className="text-2xl font-bold tabular-nums">{healthy}%</div>
          <div className="text-[10px] uppercase tracking-wide opacity-60">
            healthy
          </div>
        </div>
      </div>
    </ChartCard>
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
