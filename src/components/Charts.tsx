"use client";

import Link from "next/link";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
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
  Sector,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import { money, pct } from "@/lib/format";
import type {
  PendingWaitRow,
  StatusCompositionSlice,
} from "@/lib/approvals-metrics";
import {
  DonutBreakdownViz,
  buildCountDonutSlices,
  buildMoneyDonutSlices,
  type DonutBreakdownSlice,
} from "@/components/DonutBreakdownViz";

/** Recharts LabelFormatter values are RenderableText; coerce safely for bar labels. */
function formatCompactCountLabel(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function formatPercentLabel(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return `${n.toFixed(1)}%`;
}
import type { MarketingTrendPoint } from "@/lib/marketing-trend";

export type { DonutBreakdownSlice };
export { buildCountDonutSlices, buildMoneyDonutSlices };

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
  tall,
  fluid,
  footer,
  toolbar,
}: {
  title: string;
  children: React.ReactNode;
  empty?: boolean;
  compact?: boolean;
  tall?: boolean;
  /** Grow with content instead of a fixed viewport height. */
  fluid?: boolean;
  footer?: React.ReactNode;
  /** Controls under the title (sort, filters). Hidden when empty. */
  toolbar?: React.ReactNode;
}) {
  const heightClass = compact ? "h-48" : tall ? "h-80" : "h-64";
  const emptyHeight = compact ? "h-40" : tall ? "h-72" : "h-56";
  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {!empty && toolbar ? <div className="mb-3">{toolbar}</div> : null}
      {empty ? (
        <div
          className={`flex items-center justify-center text-sm opacity-60 ${emptyHeight}`}
        >
          Not enough data yet for this chart.
        </div>
      ) : fluid ? (
        <div className="w-full">{children}</div>
      ) : (
        <div className={`w-full ${heightClass}`}>{children}</div>
      )}
      {footer && !empty ? <div className="mt-3">{footer}</div> : null}
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
  periodLabel,
}: {
  data: { name: string; clicks: number }[];
  periodLabel?: string;
}) {
  const [sort, setSort] = useState<
    "clicks_desc" | "clicks_asc" | "name_asc" | "name_desc"
  >("clicks_desc");

  const title = periodLabel
    ? `Clicks by campaign (${periodLabel})`
    : "Clicks by campaign";

  const rows = useMemo(() => {
    const list = [...data];
    list.sort((a, b) => {
      switch (sort) {
        case "clicks_asc":
          return a.clicks - b.clicks;
        case "clicks_desc":
          return b.clicks - a.clicks;
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });
    // Use `campaign` (not `name`) for the axis — Recharts treats `name` specially
    // and can hide category labels on vertical layouts.
    return list.slice(0, 25).map((r) => ({
      campaign: r.name,
      clicks: r.clicks,
    }));
  }, [data, sort]);

  const chartHeight = Math.max(240, rows.length * 44 + 32);

  return (
    <ChartCard
      title={title}
      empty={!data.length}
      fluid
      toolbar={
        <label className="flex max-w-xs flex-col gap-1">
          <span className="text-xs opacity-70">Sort</span>
          <select
            className="select select-bordered select-sm w-full"
            value={sort}
            onChange={(e) =>
              setSort(
                e.target.value as
                  | "clicks_desc"
                  | "clicks_asc"
                  | "name_asc"
                  | "name_desc",
              )
            }
            aria-label="Sort campaign performance"
          >
            <option value="clicks_desc">Clicks: high to low</option>
            <option value="clicks_asc">Clicks: low to high</option>
            <option value="name_asc">Name: A to Z</option>
            <option value="name_desc">Name: Z to A</option>
          </select>
        </label>
      }
    >
      <div style={{ height: chartHeight, width: "100%", minHeight: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ left: 12, right: 48, top: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="campaign"
              width={168}
              interval={0}
              tick={{ fontSize: 12, fill: "currentColor" }}
            />
            <Tooltip
              formatter={(value) => [Number(value).toLocaleString(), "Clicks"]}
              labelFormatter={(label) => String(label)}
            />
            <Bar
              dataKey="clicks"
              fill="#0ea5e9"
              name="Clicks"
              radius={[0, 4, 4, 0]}
              label={{
                position: "right",
                fontSize: 11,
                fill: "currentColor",
                formatter: formatCompactCountLabel,
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

type CampaignVolumeRow = {
  name: string;
  impressions: number;
  clicks: number;
  ctr: number;
};

type RankingSort =
  | "metric_desc"
  | "metric_asc"
  | "name_asc"
  | "name_desc"
  | "ctr_desc"
  | "ctr_asc";

function RankingSortSelect({
  value,
  onChange,
  metricLabel,
  includeCtr = true,
}: {
  value: RankingSort;
  onChange: (v: RankingSort) => void;
  metricLabel: string;
  includeCtr?: boolean;
}) {
  return (
    <label className="flex max-w-xs flex-col gap-1">
      <span className="text-xs opacity-70">Sort</span>
      <select
        className="select select-bordered select-sm w-full"
        value={value}
        onChange={(e) => onChange(e.target.value as RankingSort)}
        aria-label="Sort chart"
      >
        <option value="metric_desc">{metricLabel}: high to low</option>
        <option value="metric_asc">{metricLabel}: low to high</option>
        {includeCtr ? (
          <>
            <option value="ctr_desc">CTR: high to low</option>
            <option value="ctr_asc">CTR: low to high</option>
          </>
        ) : null}
        <option value="name_asc">Name: A to Z</option>
        <option value="name_desc">Name: Z to A</option>
      </select>
    </label>
  );
}

function compareRanking(
  a: CampaignVolumeRow,
  b: CampaignVolumeRow,
  sort: RankingSort,
  metric: "clicks" | "impressions" | "ctr",
) {
  const metricVal = (r: CampaignVolumeRow) =>
    metric === "ctr" ? r.ctr : r[metric];
  switch (sort) {
    case "metric_asc":
      return metricVal(a) - metricVal(b);
    case "metric_desc":
      return metricVal(b) - metricVal(a);
    case "ctr_asc":
      return a.ctr - b.ctr;
    case "ctr_desc":
      return b.ctr - a.ctr;
    case "name_asc":
      return a.name.localeCompare(b.name);
    case "name_desc":
      return b.name.localeCompare(a.name);
    default:
      return 0;
  }
}

/** Horizontal clicks or impressions ranking with volume context. */
export function CampaignVolumeRankingChart({
  data,
  metric,
  periodLabel,
}: {
  data: CampaignVolumeRow[];
  metric: "clicks" | "impressions";
  periodLabel?: string;
}) {
  const [sort, setSort] = useState<RankingSort>("metric_desc");
  const isClicks = metric === "clicks";
  const titleBase = isClicks ? "Clicks by campaign" : "Impressions by campaign";
  const title = periodLabel ? `${titleBase} (${periodLabel})` : titleBase;
  const dataKey = isClicks ? "clicks" : "impressions";
  const fill = isClicks ? "#0284c7" : "#94a3b8";
  const metricLabel = isClicks ? "Clicks" : "Impressions";

  const rows = useMemo(() => {
    const list = [...data].sort((a, b) =>
      compareRanking(a, b, sort, metric),
    );
    return list.slice(0, 25);
  }, [data, sort, metric]);

  const chartHeight = Math.max(280, rows.length * 42 + 32);

  function VolumeTooltip({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { payload?: CampaignVolumeRow }[];
  }) {
    if (!active || !payload?.[0]?.payload) return null;
    const row = payload[0].payload;
    return (
      <div className="rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm shadow-lg">
        <div className="font-semibold">{row.name}</div>
        <ul className="mt-1 space-y-0.5 text-xs">
          <li>Impressions: {row.impressions.toLocaleString()}</li>
          <li>Clicks: {row.clicks.toLocaleString()}</li>
          <li>CTR: {row.ctr}%</li>
        </ul>
      </div>
    );
  }

  return (
    <ChartCard
      title={title}
      empty={!data.length}
      fluid
      toolbar={
        <RankingSortSelect
          value={sort}
          onChange={setSort}
          metricLabel={metricLabel}
        />
      }
      footer={
        rows.length < data.length ? (
          <p className="text-xs opacity-60">
            Showing {rows.length} of {data.length} campaigns
          </p>
        ) : null
      }
    >
      <div style={{ height: chartHeight, width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ left: 8, right: 48, top: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) =>
                Number(v) >= 1000
                  ? `${(Number(v) / 1000).toFixed(Number(v) >= 10000 ? 0 : 1)}k`
                  : String(v)
              }
            />
            <YAxis
              type="category"
              dataKey="name"
              width={180}
              tick={{ fontSize: 11 }}
            />
            <Tooltip content={<VolumeTooltip />} />
            <Bar
              dataKey={dataKey}
              name={isClicks ? "Clicks" : "Impressions"}
              fill={fill}
              radius={[0, 4, 4, 0]}
              label={{
                position: "right",
                fontSize: 11,
                formatter: formatCompactCountLabel,
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/** Dual-axis media trend: impression bars + click/conversion lines. */
export function MarketingMediaTrendChart({
  data,
  periodLabel,
}: {
  data: MarketingTrendPoint[];
  periodLabel?: string;
}) {
  const title = periodLabel
    ? `Media performance over time (${periodLabel})`
    : "Media performance over time";

  const totals = data.reduce(
    (acc, d) => {
      acc.impressions += d.impressions;
      acc.clicks += d.clicks;
      acc.conversions += d.conversions;
      acc.spend += d.spend;
      return acc;
    },
    { impressions: 0, clicks: 0, conversions: 0, spend: 0 },
  );
  const overallCtr =
    totals.impressions > 0
      ? Math.round((totals.clicks / totals.impressions) * 10000) / 100
      : 0;

  function MediaTrendTooltip({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: { payload?: MarketingTrendPoint }[];
    label?: string | number;
  }) {
    if (!active || !payload?.[0]?.payload) return null;
    const row = payload[0].payload;
    return (
      <div className="rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm shadow-lg">
        <div className="mb-1 font-semibold">{label}</div>
        <ul className="space-y-0.5 text-xs">
          <li>Impressions: {row.impressions.toLocaleString()}</li>
          <li>Clicks: {row.clicks.toLocaleString()}</li>
          <li>Conversions: {row.conversions.toLocaleString()}</li>
          <li>Spend: {money(row.spend)}</li>
          <li>CTR: {row.ctr}%</li>
        </ul>
      </div>
    );
  }

  return (
    <ChartCard
      title={title}
      empty={!data.length}
      tall
      footer={
        <p className="text-xs opacity-70">
          Period totals: {totals.impressions.toLocaleString()} impr ·{" "}
          {totals.clicks.toLocaleString()} clicks ·{" "}
          {totals.conversions.toLocaleString()} conv · {money(totals.spend)}{" "}
          spend · {overallCtr}% CTR
          <span className="opacity-50">
            {" "}
            (bars = impressions · lines = clicks / conversions)
          </span>
        </p>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis
            yAxisId="imp"
            tick={{ fontSize: 11 }}
            width={48}
            allowDecimals={false}
            tickFormatter={(v) =>
              Number(v) >= 1000
                ? `${(Number(v) / 1000).toFixed(0)}k`
                : String(v)
            }
          />
          <YAxis
            yAxisId="eng"
            orientation="right"
            tick={{ fontSize: 11 }}
            width={40}
            allowDecimals={false}
          />
          <Tooltip content={<MediaTrendTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar
            yAxisId="imp"
            dataKey="impressions"
            name="Impressions"
            fill="#94a3b8"
            fillOpacity={0.55}
            radius={[3, 3, 0, 0]}
          />
          <Line
            yAxisId="eng"
            type="monotone"
            dataKey="clicks"
            name="Clicks"
            stroke="#0284c7"
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
          <Line
            yAxisId="eng"
            type="monotone"
            dataKey="conversions"
            name="Conversions"
            stroke="oklch(68% 0.12 160)"
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ImpressionsClicksTrendChart({
  data,
  title = "Media performance over time",
  periodLabel,
}: {
  data: {
    date: string;
    impressions: number;
    clicks: number;
    conversions?: number;
    spend?: number;
    ctr?: number;
  }[];
  title?: string;
  periodLabel?: string;
}) {
  const showExtended = data.some(
    (d) => (d.conversions ?? 0) > 0 || (d.spend ?? 0) > 0,
  );
  const chartTitle = periodLabel ? `${title} (${periodLabel})` : title;

  function MediaTrendTooltip({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: {
      name?: string;
      value?: number;
      color?: string;
      dataKey?: string;
    }[];
    label?: string | number;
  }) {
    if (!active || !payload?.length) return null;
    const row = data.find((d) => d.date === label);
    return (
      <div className="rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm shadow-lg">
        <div className="mb-1 font-semibold">{label}</div>
        <ul className="space-y-0.5 text-xs">
          <li>Impressions: {(row?.impressions ?? 0).toLocaleString()}</li>
          <li>Clicks: {(row?.clicks ?? 0).toLocaleString()}</li>
          {showExtended ? (
            <>
              <li>Conversions: {(row?.conversions ?? 0).toLocaleString()}</li>
              <li>Spend: {money(row?.spend ?? 0)}</li>
              <li>CTR: {row?.ctr ?? 0}%</li>
            </>
          ) : null}
        </ul>
      </div>
    );
  }

  return (
    <ChartCard title={chartTitle} empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11 }}
            width={44}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11 }}
            width={48}
            tickFormatter={(v) =>
              showExtended ? formatAxisMoney(Number(v)) : String(v)
            }
          />
          <Tooltip content={<MediaTrendTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="impressions"
            stroke="#94a3b8"
            strokeWidth={2}
            name="Impressions"
            dot={false}
          />
          <Line
            yAxisId={showExtended ? "left" : "right"}
            type="monotone"
            dataKey="clicks"
            stroke="#0284c7"
            strokeWidth={2}
            name="Clicks"
            dot={false}
          />
          {showExtended ? (
            <>
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="conversions"
                stroke="oklch(68% 0.12 160)"
                strokeWidth={2}
                name="Conversions"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="spend"
                stroke="oklch(70% 0.12 55)"
                strokeWidth={2}
                name="Spend"
                dot={false}
              />
            </>
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function CtrByCampaignChart({
  data,
  periodLabel,
}: {
  data: { name: string; ctr: number }[];
  periodLabel?: string;
}) {
  const title = periodLabel
    ? `CTR % by campaign (${periodLabel})`
    : "CTR % by campaign";
  return (
    <ChartCard title={title} empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="name" hide />
          <YAxis unit="%" />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(2)}%`, "CTR"]}
          />
          <Bar dataKey="ctr" fill="#14b8a6" name="CTR %" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** Horizontal CTR ranking with volume context + portfolio average line. */
export function CampaignCtrRankingChart({
  data,
  periodLabel,
  averageCtr,
}: {
  data: {
    name: string;
    ctr: number;
    impressions: number;
    clicks: number;
  }[];
  periodLabel?: string;
  averageCtr?: number;
}) {
  const [sort, setSort] = useState<RankingSort>("metric_desc");

  const avg =
    averageCtr ??
    (() => {
      const imp = data.reduce((s, r) => s + r.impressions, 0);
      const clk = data.reduce((s, r) => s + r.clicks, 0);
      return imp > 0 ? Math.round((clk / imp) * 10000) / 100 : 0;
    })();

  const rows = useMemo(() => {
    const list = [...data].sort((a, b) =>
      compareRanking(a, b, sort, "ctr"),
    );
    return list.slice(0, 25);
  }, [data, sort]);

  const title = periodLabel
    ? `CTR by campaign (${periodLabel})`
    : "CTR by campaign";
  const chartHeight = Math.max(280, rows.length * 42 + 32);

  function CtrTooltip({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: {
      payload?: {
        name: string;
        ctr: number;
        impressions: number;
        clicks: number;
      };
    }[];
  }) {
    if (!active || !payload?.[0]?.payload) return null;
    const row = payload[0].payload;
    const vsAvg = row.ctr - avg;
    return (
      <div className="rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm shadow-lg">
        <div className="font-semibold">{row.name}</div>
        <div className="mt-1 tabular-nums font-medium">{row.ctr}% CTR</div>
        <ul className="mt-1 space-y-0.5 text-xs opacity-80">
          <li>Impressions: {row.impressions.toLocaleString()}</li>
          <li>Clicks: {row.clicks.toLocaleString()}</li>
          <li>
            vs avg: {vsAvg >= 0 ? "+" : ""}
            {vsAvg.toFixed(2)} pp
          </li>
        </ul>
      </div>
    );
  }

  return (
    <ChartCard
      title={title}
      empty={!data.length}
      fluid
      toolbar={
        <RankingSortSelect
          value={sort}
          onChange={setSort}
          metricLabel="CTR"
          includeCtr={false}
        />
      }
      footer={
        <p className="text-xs opacity-70">
          Portfolio avg CTR {avg}% · bars colored above/below average · only
          campaigns with impressions in this period
          {rows.length < data.length
            ? ` · showing ${rows.length} of ${data.length}`
            : ""}
        </p>
      }
    >
      <div style={{ height: chartHeight, width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ left: 8, right: 48, top: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              type="number"
              unit="%"
              tick={{ fontSize: 11 }}
              domain={[0, "auto"]}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={180}
              tick={{ fontSize: 11 }}
            />
            <Tooltip content={<CtrTooltip />} />
            {avg > 0 ? (
              <ReferenceLine
                x={avg}
                stroke="oklch(55% 0.02 250)"
                strokeDasharray="4 4"
                label={{
                  value: `Avg ${avg}%`,
                  position: "top",
                  fontSize: 10,
                  fill: "currentColor",
                }}
              />
            ) : null}
            <Bar
              dataKey="ctr"
              name="CTR %"
              radius={[0, 4, 4, 0]}
              label={{
                position: "right",
                fontSize: 11,
                formatter: formatPercentLabel,
              }}
            >
              {rows.map((row) => (
                <Cell
                  key={row.name}
                  fill={
                    row.ctr >= avg
                      ? "oklch(68% 0.12 160)"
                      : "oklch(70% 0.12 55)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

const APPROVAL_STATUS_COLORS: Record<string, string> = {
  Pending: "oklch(70% 0.12 55)",
  "Changes Requested": "oklch(72% 0.1 300)",
  Approved: "oklch(68% 0.12 160)",
  Rejected: "oklch(62% 0.18 25)",
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
  layout = "split",
  showDetailsCard = true,
}: {
  slices: DonutBreakdownSlice[];
  selectedKey?: string | null;
  onSelectKey?: (key: string) => void;
  onClearSelection?: () => void;
  layout?: "split" | "stacked";
  showDetailsCard?: boolean;
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
      layout={layout}
      showDetailsCard={showDetailsCard}
    />
  );
}

const STATUS_DONUT_OUTER = 88;
const STATUS_DONUT_INNER = 52;

function StatusDetailsCard({
  slice,
  className = "",
}: {
  slice: StatusCompositionSlice;
  className?: string;
}) {
  const color = APPROVAL_STATUS_COLORS[slice.name] ?? "#94a3b8";
  return (
    <div
      className={`min-w-[220px] rounded-2xl border border-base-300 bg-base-300 px-5 py-4 text-sm text-base-content shadow-xl ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="font-semibold">{slice.name}</span>
      </div>
      <dl className="space-y-2 text-xs">
        <div className="flex justify-between gap-6">
          <dt className="opacity-70">Requests</dt>
          <dd className="text-base font-bold tabular-nums">{slice.value}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="opacity-70">Share of book</dt>
          <dd className="font-semibold tabular-nums">{pct(slice.share)}</dd>
        </div>
        {slice.byType.length > 0 ? (
          <div className="border-t border-base-content/10 pt-2">
            <dt className="mb-1.5 opacity-70">By type</dt>
            <dd>
              <ul className="space-y-1">
                {slice.byType.map((t) => (
                  <li
                    key={t.name}
                    className="flex justify-between gap-4 font-semibold"
                  >
                    <span className="truncate opacity-80">{t.name}</span>
                    <span className="tabular-nums">{t.value}</span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

type StatusSectorProps = {
  index?: number;
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  fill?: string;
  payload?: StatusCompositionSlice;
};

const StatusDonut = memo(function StatusDonut({
  slices,
  focusIndex,
  animate,
  total,
  onActivate,
  onDeactivate,
  onSelect,
}: {
  slices: StatusCompositionSlice[];
  focusIndex: number | null;
  animate: boolean;
  total: number;
  onActivate: (index: number) => void;
  onDeactivate: () => void;
  onSelect: (status: string) => void;
}) {
  const renderShape = useCallback(
    (props: StatusSectorProps) => {
      const idx = props.index ?? 0;
      const slice = props.payload ?? slices[idx];
      const isActive = focusIndex === idx;
      const faded = focusIndex != null && focusIndex !== idx;
      const r = props.outerRadius ?? STATUS_DONUT_OUTER;
      const cx = props.cx ?? 0;
      const cy = props.cy ?? 0;
      const label = slice
        ? `${slice.name}: ${slice.value} requests, ${pct(slice.share)}`
        : "Status slice";

      const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (slice) onSelect(slice.name);
        }
      };

      return (
        <g
          tabIndex={0}
          role="button"
          aria-label={`${label}. Press Enter to filter by this status.`}
          style={{
            cursor: "pointer",
            outline: "none",
            opacity: faded ? 0.35 : 1,
            transform: isActive ? "scale(1.09)" : "scale(1)",
            transformOrigin: `${cx}px ${cy}px`,
            transition: "transform 220ms ease, opacity 220ms ease",
          }}
          onFocus={() => onActivate(idx)}
          onBlur={onDeactivate}
          onKeyDown={onKeyDown}
        >
          <Sector
            cx={props.cx}
            cy={props.cy}
            innerRadius={props.innerRadius}
            outerRadius={r}
            startAngle={props.startAngle}
            endAngle={props.endAngle}
            fill={props.fill}
          />
          {isActive ? (
            <Sector
              cx={props.cx}
              cy={props.cy}
              innerRadius={r}
              outerRadius={r * 1.03}
              startAngle={props.startAngle}
              endAngle={props.endAngle}
              fill={props.fill}
              opacity={0.35}
            />
          ) : null}
        </g>
      );
    },
    [focusIndex, onActivate, onDeactivate, onSelect, slices],
  );

  return (
    <div
      className="mx-auto h-[260px] w-full max-w-[320px]"
      role="img"
      aria-label={`Approvals by status donut. Total ${total} requests.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={STATUS_DONUT_INNER}
            outerRadius={STATUS_DONUT_OUTER}
            paddingAngle={2}
            label={false}
            isAnimationActive={animate}
            animationDuration={250}
            animationEasing="ease-out"
            onMouseEnter={(_, index) => onActivate(index)}
            onClick={(_, index) => {
              const row = slices[index];
              if (row) onSelect(row.name);
            }}
            style={{ cursor: "pointer", outline: "none" }}
            shape={renderShape}
          >
            {slices.map((d) => (
              <Cell
                key={d.name}
                fill={APPROVAL_STATUS_COLORS[d.name] ?? "#94a3b8"}
                stroke="transparent"
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});

/** Costs-tab style interactive status donut with legend + details. */
export function ApprovalStatusDetailChart({
  slices,
  total,
  selectedStatus,
  onSelectStatus,
  onClearStatus,
}: {
  slices: StatusCompositionSlice[];
  total: number;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  onClearStatus: () => void;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [animate, setAnimate] = useState(true);

  const visible = useMemo(() => slices.filter((s) => s.value > 0), [slices]);

  const slicesSignature = useMemo(
    () => visible.map((s) => `${s.name}:${s.value}`).join("|"),
    [visible],
  );

  useEffect(() => {
    setAnimate(true);
    const t = setTimeout(() => setAnimate(false), 280);
    return () => clearTimeout(t);
  }, [slicesSignature]);

  const selectedSlice =
    selectedStatus !== "all"
      ? (visible.find((s) => s.name === selectedStatus) ?? null)
      : null;
  const hoveredSlice =
    hoverIndex != null && visible[hoverIndex] ? visible[hoverIndex] : null;
  const detailsSlice = hoveredSlice ?? selectedSlice;

  const clearHover = useCallback(() => setHoverIndex(null), []);
  const activate = useCallback((index: number) => {
    setHoverIndex((prev) => (prev === index ? prev : index));
  }, []);

  const handleSelect = useCallback(
    (status: string) => {
      setHoverIndex(null);
      if (selectedStatus === status) onClearStatus();
      else onSelectStatus(status);
    },
    [onClearStatus, onSelectStatus, selectedStatus],
  );

  return (
    <section className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">Approvals by status</h3>
          <p className="mt-0.5 text-xs opacity-70">
            Click a slice or row to filter.
          </p>
        </div>
        {selectedStatus !== "all" ? (
          <div className="flex flex-wrap items-center gap-1.5 rounded-box border border-base-300 bg-base-200/50 px-2 py-1 text-xs">
            <span className="opacity-70">Viewing</span>
            <span
              className="font-semibold"
              style={{
                color: APPROVAL_STATUS_COLORS[selectedStatus] ?? undefined,
              }}
            >
              {selectedStatus}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={onClearStatus}
            >
              Clear
            </button>
          </div>
        ) : null}
      </div>

      {!visible.length ? (
        <div className="flex h-56 items-center justify-center text-sm opacity-60">
          Not enough data yet for this chart.
        </div>
      ) : (
        <div className="flex flex-col gap-3" onMouseLeave={clearHover}>
          <div className="relative mx-auto w-full max-w-[320px] shrink-0">
            <StatusDonut
              slices={visible}
              focusIndex={hoverIndex}
              animate={animate}
              total={total}
              onActivate={activate}
              onDeactivate={clearHover}
              onSelect={handleSelect}
            />
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-live="polite"
            >
              <div className="max-w-[120px] text-center transition-opacity duration-300">
                {selectedSlice ? (
                  <>
                    <div className="text-[10px] font-medium leading-tight opacity-70">
                      {selectedSlice.name}
                    </div>
                    <div className="mt-0.5 text-lg font-bold tracking-tight tabular-nums">
                      {selectedSlice.value}
                    </div>
                    <div className="text-xs opacity-70">
                      {pct(selectedSlice.share)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[10px] font-medium uppercase tracking-wide opacity-60">
                      Total
                    </div>
                    <div className="mt-0.5 text-lg font-bold tracking-tight tabular-nums">
                      {total}
                    </div>
                    <div className="text-xs opacity-70">
                      {total === 1 ? "1 request" : `${total} requests`}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <ul className="space-y-0.5" role="list">
              {visible.map((slice, index) => {
                const hovered = hoverIndex === index;
                const selected = selectedStatus === slice.name;
                return (
                  <li key={slice.name}>
                    <button
                      type="button"
                      className={`grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-box px-2 py-1.5 text-left text-xs transition ${
                        hovered || selected
                          ? "bg-base-200"
                          : "hover:bg-base-200/60"
                      }`}
                      style={{
                        borderLeft: `3px solid ${APPROVAL_STATUS_COLORS[slice.name] ?? "#94a3b8"}`,
                      }}
                      aria-pressed={selected}
                      onMouseEnter={() => activate(index)}
                      onFocus={() => activate(index)}
                      onBlur={clearHover}
                      onClick={() => handleSelect(slice.name)}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            APPROVAL_STATUS_COLORS[slice.name] ?? "#94a3b8",
                        }}
                        aria-hidden
                      />
                      <span className="min-w-0 truncate font-medium">
                        {slice.name}
                      </span>
                      <span className="text-right font-semibold tabular-nums">
                        {slice.value}
                      </span>
                      <span className="w-12 text-right tabular-nums opacity-70">
                        {pct(slice.share)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {detailsSlice ? (
              <div aria-live="polite">
                <StatusDetailsCard
                  slice={detailsSlice}
                  className="w-full !px-3 !py-3 !shadow-md"
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

export function ApprovalAgingBarChart({
  data,
}: {
  data: { bucket: string; count: number; fill?: string }[];
}) {
  const hasAny = data.some((d) => d.count > 0);
  return (
    <ChartCard title="Pending by wait time" empty={!hasAny}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
          <Tooltip />
          <Bar dataKey="count" name="Pending" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.bucket} fill={entry.fill ?? "#f59e0b"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function PendingWaitTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: {
    payload: PendingWaitRow;
  }[];
}) {
  if (!active || !payload?.[0]) return null;
  const row = payload[0].payload;
  const bucketLabel =
    row.bucket === "overdue"
      ? "Overdue (7d+)"
      : row.bucket === "aging"
        ? "Aging (3-6d)"
        : "Fresh (0-2d)";
  return (
    <div className="max-w-xs rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm shadow-lg">
      <div className="font-semibold">{row.clientName}</div>
      <div className="text-xs opacity-70">{row.campaignName}</div>
      <div className="mt-1 tabular-nums font-medium">
        Waiting {row.waitingDays}d
      </div>
      <div className="text-xs opacity-80">{row.approvalType}</div>
      <div className="mt-1 text-xs font-medium" style={{ color: row.fill }}>
        {bucketLabel}
      </div>
    </div>
  );
}

/** Pending approvals by days waiting (bar length = wait time). */
export function ApprovalClientWorkloadChart({
  rows,
  pendingTotal,
  overdueCount,
  selectedClientId,
  onSelectClient,
  onClearClient,
}: {
  rows: PendingWaitRow[];
  pendingTotal: number;
  overdueCount: number;
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
  onClearClient: () => void;
}) {
  const chartHeight = Math.max(220, rows.length * 36 + 28);

  return (
    <section className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">Pending wait time</h3>
          <p className="mt-0.5 text-xs opacity-70">
            Bar length is days waiting — click to filter by client.
          </p>
        </div>
        {selectedClientId !== "all" ? (
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={onClearClient}
          >
            Clear
          </button>
        ) : null}
      </div>

      {!rows.length ? (
        <div className="flex h-56 items-center justify-center text-sm opacity-60">
          No pending approvals in this filter.
        </div>
      ) : (
        <>
          <div className="h-72 w-full overflow-y-auto">
            <div style={{ height: chartHeight, minHeight: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rows}
                  layout="vertical"
                  margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    unit="d"
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={118}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip content={<PendingWaitTooltip />} />
                  <Bar
                    dataKey="waitingDays"
                    name="Days waiting"
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    onClick={(entry) => {
                      const raw = entry as unknown as {
                        payload?: PendingWaitRow;
                        clientId?: string;
                      };
                      const id = raw.payload?.clientId ?? raw.clientId;
                      if (!id) return;
                      if (selectedClientId === id) onClearClient();
                      else onSelectClient(id);
                    }}
                  >
                    {rows.map((row) => (
                      <Cell
                        key={row.id}
                        fill={row.fill}
                        opacity={
                          selectedClientId === "all" ||
                          selectedClientId === row.clientId
                            ? 1
                            : 0.35
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs opacity-70">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: "#22c55e" }}
              />
              Fresh 0-2d
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: "#f59e0b" }}
              />
              Aging 3-6d
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: "#ef4444" }}
              />
              Overdue 7d+
            </span>
            <span className="ml-auto tabular-nums">
              {pendingTotal} pending · {overdueCount} overdue
            </span>
          </div>
        </>
      )}
    </section>
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

/** 12-month portfolio conversions (bars) + spend (line). */
export function PortfolioMediaByMonthChart({
  data,
}: {
  data: { month: string; conversions: number; spend: number; clicks: number }[];
}) {
  const hasAny = data.some(
    (d) => d.conversions > 0 || d.spend > 0 || d.clicks > 0,
  );

  function PortfolioMonthTooltip({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: {
      payload?: {
        month: string;
        conversions: number;
        spend: number;
        clicks: number;
      };
    }[];
    label?: string | number;
  }) {
    if (!active || !payload?.[0]?.payload) return null;
    const row = payload[0].payload;
    return (
      <div className="rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm shadow-lg">
        <div className="mb-1 font-semibold">{label}</div>
        <ul className="space-y-0.5 text-xs">
          <li>Conversions: {row.conversions.toLocaleString()}</li>
          <li>Spend: {money(row.spend)}</li>
          <li>Clicks: {row.clicks.toLocaleString()}</li>
        </ul>
      </div>
    );
  }

  return (
    <ChartCard title="Portfolio performance by month" empty={!hasAny} tall>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis
            yAxisId="conv"
            allowDecimals={false}
            tick={{ fontSize: 11 }}
            width={40}
          />
          <YAxis
            yAxisId="spend"
            orientation="right"
            tick={{ fontSize: 11 }}
            width={48}
            tickFormatter={(v) => formatAxisMoney(Number(v))}
          />
          <Tooltip content={<PortfolioMonthTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar
            yAxisId="conv"
            dataKey="conversions"
            name="Conversions"
            fill="oklch(68% 0.12 160)"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="spend"
            type="monotone"
            dataKey="spend"
            name="Spend"
            stroke="oklch(70% 0.12 55)"
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
        </ComposedChart>
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
  periodLabel,
}: {
  slices: DonutBreakdownSlice[];
  selectedKey?: string | null;
  onSelectKey?: (key: string) => void;
  onClearSelection?: () => void;
  periodLabel?: string;
}) {
  return (
    <DonutBreakdownViz
      title="Spend by strategy"
      subtitle={periodLabel ?? "Last 30 days"}
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
  const [sort, setSort] = useState<"metric_desc" | "metric_asc" | "name_asc" | "name_desc">(
    "metric_desc",
  );

  const rows = useMemo(() => {
    const list = [...data];
    list.sort((a, b) => {
      switch (sort) {
        case "metric_asc":
          return a.conversions - b.conversions;
        case "metric_desc":
          return b.conversions - a.conversions;
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });
    return list;
  }, [data, sort]);

  const hasAny = rows.some((d) => d.conversions > 0);
  const colorByName = useMemo(() => {
    const map = new Map<string, string>();
    data.forEach((entry, i) => {
      map.set(entry.name, STRATEGY_COLORS[i % STRATEGY_COLORS.length]!);
    });
    return map;
  }, [data]);

  return (
    <ChartCard
      title="Conversions by strategy"
      empty={!hasAny}
      toolbar={
        <label className="flex max-w-xs flex-col gap-1">
          <span className="text-xs opacity-70">Sort</span>
          <select
            className="select select-bordered select-sm w-full"
            value={sort}
            onChange={(e) =>
              setSort(
                e.target.value as
                  | "metric_desc"
                  | "metric_asc"
                  | "name_asc"
                  | "name_desc",
              )
            }
            aria-label="Sort conversions by strategy"
          >
            <option value="metric_desc">Conversions: high to low</option>
            <option value="metric_asc">Conversions: low to high</option>
            <option value="name_asc">Name: A to Z</option>
            <option value="name_desc">Name: Z to A</option>
          </select>
        </label>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="conversions" fill="#a78bfa" name="Conversions">
            {rows.map((entry) => (
              <Cell
                key={entry.name}
                fill={colorByName.get(entry.name) ?? "#94a3b8"}
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
