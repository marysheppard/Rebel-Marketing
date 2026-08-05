"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { ArPaymentStatusViz } from "@/components/ar/ArPaymentStatusViz";
import type {
  AgingPoint,
  CollectionRiskRow,
  PaymentStatusKey,
  PaymentStatusSlice,
  TopClientRow,
  TrendPoint,
} from "@/lib/ar/calculations";
import {
  AR_TREND_GROUP_LABELS,
  AR_TREND_SERIES,
  AR_TREND_SERIES_COLORS,
  AR_TREND_SERIES_LABELS,
  type ArAgingBucket,
  type ArTrendGroupBy,
  type ArTrendSeriesKey,
  type ArTrendSeriesSelection,
} from "@/lib/ar/filters";
import { money } from "@/lib/format";

const AGING_COLORS: Record<ArAgingBucket, string> = {
  Current: "oklch(68% 0.12 160)",
  "1–30": "oklch(70% 0.12 85)",
  "31–60": "oklch(70% 0.12 55)",
  "61–90": "oklch(65% 0.14 40)",
  "90+": "oklch(60% 0.16 25)",
};

function ChartShell({
  title,
  empty,
  emptyMessage,
  children,
  actions,
}: {
  title: string;
  empty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        {actions}
      </div>
      {empty ? (
        <div className="flex h-56 items-center justify-center text-sm opacity-60">
          {emptyMessage ?? "No data for the selected filters."}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function ArTrendChart({
  data,
  rangeLabel,
  groupBy,
  onGroupByChange,
  series,
  onSeriesChange,
}: {
  data: TrendPoint[];
  rangeLabel?: string;
  groupBy: ArTrendGroupBy;
  onGroupByChange: (group: ArTrendGroupBy) => void;
  series: ArTrendSeriesSelection;
  onSeriesChange: (series: ArTrendSeriesSelection) => void;
}) {
  const pointCount = data.length;
  const tickInterval =
    pointCount <= 12 ? 0 : pointCount <= 24 ? 1 : Math.ceil(pointCount / 12) - 1;
  const minWidth = Math.max(640, pointCount * (pointCount > 36 ? 28 : 40));
  const visibleSeries = AR_TREND_SERIES.filter((key) => series.includes(key));

  const seriesSummary =
    visibleSeries.length === AR_TREND_SERIES.length
      ? "All series"
      : visibleSeries.length === 0
        ? "No series"
        : `${visibleSeries.length} of ${AR_TREND_SERIES.length} series`;

  function toggleSeries(key: ArTrendSeriesKey) {
    if (series.includes(key)) {
      onSeriesChange(series.filter((s) => s !== key));
    } else {
      onSeriesChange(
        AR_TREND_SERIES.filter((s) => s === key || series.includes(s)),
      );
    }
  }

  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Accounts Receivable Trend</h3>
          {rangeLabel ? (
            <p className="text-xs opacity-60">{rangeLabel}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="dropdown dropdown-end">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-xs border border-base-300"
              aria-haspopup="listbox"
              aria-label={`Filter series: ${seriesSummary}`}
            >
              Series
              <span className="opacity-60">· {seriesSummary}</span>
            </div>
            <div
              tabIndex={0}
              className="dropdown-content z-20 mt-1 w-72 rounded-box border border-base-300 bg-base-100 p-3 shadow-lg"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <p className="mb-2 text-xs font-medium opacity-70">Show series</p>
              <div className="flex flex-col gap-2" role="group">
                {AR_TREND_SERIES.map((key) => {
                  const checked = series.includes(key);
                  return (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-xs hover:bg-base-200"
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={checked}
                        onChange={() => toggleSeries(key)}
                        aria-label={`Show ${AR_TREND_SERIES_LABELS[key]} on trend chart`}
                      />
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: AR_TREND_SERIES_COLORS[key],
                        }}
                        aria-hidden
                      />
                      <span>{AR_TREND_SERIES_LABELS[key]}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <span className="opacity-70">Group by</span>
            <select
              className="select select-bordered select-xs"
              value={groupBy}
              onChange={(e) =>
                onGroupByChange(e.target.value as ArTrendGroupBy)
              }
              aria-label="Group AR trend by month, quarter, or year"
            >
              {(Object.keys(AR_TREND_GROUP_LABELS) as ArTrendGroupBy[]).map(
                (key) => (
                  <option key={key} value={key}>
                    {AR_TREND_GROUP_LABELS[key]}
                  </option>
                ),
              )}
            </select>
          </label>
          <p className="text-xs opacity-60">
            {pointCount} {AR_TREND_GROUP_LABELS[groupBy].toLowerCase()}
            {pointCount === 1 ? "" : "s"} · empty periods = $0
          </p>
        </div>
      </div>

      {!data.length || visibleSeries.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-sm opacity-60">
          {visibleSeries.length === 0
            ? "Select at least one series to display the trend."
            : "No data for the selected filters."}
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <div style={{ minWidth }} className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 8, right: 12, left: 8, bottom: 48 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis
                  dataKey="label"
                  interval={tickInterval}
                  angle={pointCount > 10 ? -35 : 0}
                  textAnchor={pointCount > 10 ? "end" : "middle"}
                  height={pointCount > 10 ? 60 : 30}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) =>
                    Number(v) >= 1000
                      ? `$${(Number(v) / 1000).toFixed(Number(v) >= 10000 ? 0 : 1)}k`
                      : `$${v}`
                  }
                  width={56}
                />
                <Tooltip
                  content={(props) => {
                    const { active, payload, label } = props;
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-box border border-base-300 bg-base-100 px-3 py-2 text-xs shadow">
                        <div className="mb-1 font-medium">{String(label)}</div>
                        {payload.map((p) => (
                          <div key={String(p.name)}>
                            {p.name}: {money(Number(p.value ?? 0))}
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend />
                {visibleSeries.map((key) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={AR_TREND_SERIES_LABELS[key]}
                    stroke={AR_TREND_SERIES_COLORS[key]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function TopClientsChart({
  rows,
  onSelectClient,
}: {
  rows: TopClientRow[];
  onSelectClient: (clientId: string) => void;
}) {
  const clientIds = useMemo(() => rows.map((r) => r.clientId), [rows]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const userFiltered = useRef(false);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (!userFiltered.current || prev.length === 0) {
        // Default to top 8 (or all if fewer)
        return clientIds.slice(0, 8);
      }
      const kept = clientIds.filter((id) => prev.includes(id));
      return kept.length > 0 ? kept : clientIds.slice(0, 8);
    });
  }, [clientIds]);

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.includes(r.clientId)),
    [rows, selectedIds],
  );

  const searchLower = clientSearch.trim().toLowerCase();
  const searchableRows = useMemo(() => {
    if (!searchLower) return rows;
    return rows.filter((r) =>
      r.clientName.toLowerCase().includes(searchLower),
    );
  }, [rows, searchLower]);

  const chartData = selectedRows.map((c) => ({
    ...c,
    label:
      c.clientName.length > 22
        ? `${c.clientName.slice(0, 21)}…`
        : c.clientName,
  }));

  const chartHeight = Math.max(280, chartData.length * 48 + 72);
  const allSelected =
    rows.length > 0 && selectedIds.length === rows.length;
  const clientSummary = allSelected
    ? "All clients"
    : selectedIds.length === 0
      ? "No clients"
      : `${selectedIds.length} of ${rows.length} clients`;

  function toggleClient(id: string) {
    userFiltered.current = true;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectAllVisible() {
    userFiltered.current = true;
    const visibleIds = searchableRows.map((r) => r.clientId);
    setSelectedIds((prev) => {
      const set = new Set(prev);
      for (const id of visibleIds) set.add(id);
      return clientIds.filter((id) => set.has(id));
    });
  }

  function clearVisible() {
    userFiltered.current = true;
    const visible = new Set(searchableRows.map((r) => r.clientId));
    setSelectedIds((prev) => prev.filter((id) => !visible.has(id)));
  }

  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Top Clients by Outstanding Balance</h3>
          {rows.length > 0 ? (
            <p className="text-xs opacity-60">
              {selectedRows.length} of {rows.length} client
              {rows.length === 1 ? "" : "s"} shown
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="dropdown dropdown-end">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-xs border border-base-300"
              aria-haspopup="listbox"
              aria-label={`Filter clients: ${clientSummary}`}
            >
              Clients
              <span className="opacity-60">· {clientSummary}</span>
            </div>
            <div
              tabIndex={0}
              className="dropdown-content z-20 mt-1 w-80 rounded-box border border-base-300 bg-base-100 p-3 shadow-lg"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <label className="mb-2 block">
                <span className="sr-only">Search clients</span>
                <input
                  type="search"
                  className="input input-bordered input-xs w-full"
                  placeholder="Search clients…"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  aria-label="Search clients"
                />
              </label>
              <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
                <button
                  type="button"
                  className="link link-hover opacity-70"
                  onClick={selectAllVisible}
                >
                  Select {searchLower ? "visible" : "all"}
                </button>
                <button
                  type="button"
                  className="link link-hover opacity-70"
                  onClick={clearVisible}
                >
                  Clear {searchLower ? "visible" : "all"}
                </button>
              </div>
              <div
                className="flex max-h-56 flex-col gap-1 overflow-y-auto"
                role="group"
                aria-label="Clients to include in chart"
              >
                {searchableRows.length === 0 ? (
                  <p className="px-1 py-2 text-xs opacity-60">
                    No clients match “{clientSearch.trim()}”.
                  </p>
                ) : (
                  searchableRows.map((r) => {
                    const checked = selectedIds.includes(r.clientId);
                    return (
                      <label
                        key={r.clientId}
                        className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-1.5 text-xs hover:bg-base-200"
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs mt-0.5"
                          checked={checked}
                          onChange={() => toggleClient(r.clientId)}
                          aria-label={`Include ${r.clientName} on chart`}
                        />
                        <span className="min-w-0 leading-snug">
                          {r.clientName}
                          <span className="ml-1 opacity-50">
                            · {money(r.outstanding)}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!rows.length ? (
        <div className="flex h-56 items-center justify-center text-sm opacity-60">
          No outstanding balances for the selected filters.
        </div>
      ) : selectedRows.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-sm opacity-60">
          Select at least one client to display the chart.
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <div style={{ height: chartHeight }} className="min-h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                barCategoryGap="32%"
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) =>
                    Number(v) >= 1000
                      ? `$${(Number(v) / 1000).toFixed(Number(v) >= 10000 ? 0 : 1)}k`
                      : `$${v}`
                  }
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={140}
                  interval={0}
                  tickMargin={8}
                  tick={{ fontSize: 10, fill: "currentColor" }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload as TopClientRow | undefined;
                    if (!row) return null;
                    return (
                      <div className="rounded-box border border-base-300 bg-base-100 px-3 py-2 text-xs shadow">
                        <div className="mb-1 font-medium">{row.clientName}</div>
                        <div>Outstanding: {money(row.outstanding)}</div>
                        <div>
                          Oldest invoice: {row.oldestInvoiceDate ?? "—"}
                        </div>
                        <div>
                          Avg days late:{" "}
                          {row.avgDaysLate == null
                            ? "—"
                            : row.avgDaysLate.toFixed(1)}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="outstanding"
                  name="Outstanding"
                  fill="oklch(65% 0.14 250)"
                  cursor="pointer"
                  onClick={(entry) => {
                    const payload = entry?.payload as TopClientRow | undefined;
                    const id = payload?.clientId;
                    if (id) onSelectClient(id);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export function ArCharts({
  aging,
  trend,
  topClients,
  paymentStatus,
  risks,
  rangeStart,
  rangeEnd,
  presetLabel,
  rangeLabel,
  trendGroup,
  onTrendGroupChange,
  trendSeries,
  onTrendSeriesChange,
  selectedPaymentStatus,
  onSelectAging,
  onSelectClient,
  onSelectPaymentStatus,
  onClearPaymentStatus,
}: {
  aging: AgingPoint[];
  trend: TrendPoint[];
  topClients: TopClientRow[];
  paymentStatus: PaymentStatusSlice[];
  risks: CollectionRiskRow[];
  rangeStart: string;
  rangeEnd: string;
  presetLabel: string;
  rangeLabel?: string;
  trendGroup: ArTrendGroupBy;
  onTrendGroupChange: (group: ArTrendGroupBy) => void;
  trendSeries: ArTrendSeriesSelection;
  onTrendSeriesChange: (series: ArTrendSeriesSelection) => void;
  selectedPaymentStatus: PaymentStatusKey | null;
  onSelectAging: (bucket: ArAgingBucket) => void;
  onSelectClient: (clientId: string) => void;
  onSelectPaymentStatus: (key: PaymentStatusKey) => void;
  onClearPaymentStatus: () => void;
}) {
  const agingStack = [
    {
      name: "Outstanding",
      ...Object.fromEntries(aging.map((a) => [a.bucket, a.amount])),
    },
  ];
  const agingTotal = aging.reduce((s, a) => s + a.amount, 0);

  return (
    <div>
      <div className="mb-6">
        <ChartShell title="Accounts Receivable Aging" empty={agingTotal <= 0}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={agingStack}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) =>
                    Number(v) >= 1000
                      ? `$${(Number(v) / 1000).toFixed(0)}k`
                      : `$${v}`
                  }
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-box border border-base-300 bg-base-100 px-3 py-2 text-xs shadow">
                        {payload.map((p) => (
                          <div key={String(p.dataKey)}>
                            {String(p.name)}: {money(Number(p.value ?? 0))}
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend />
                {aging.map((a) => (
                  <Bar
                    key={a.bucket}
                    dataKey={a.bucket}
                    stackId="ar"
                    fill={AGING_COLORS[a.bucket]}
                    cursor="pointer"
                    onClick={() => onSelectAging(a.bucket)}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {aging.map((a) => (
              <button
                key={a.bucket}
                type="button"
                className="btn btn-ghost btn-xs border border-base-300"
                onClick={() => onSelectAging(a.bucket)}
              >
                <span
                  className="mr-1 inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: AGING_COLORS[a.bucket] }}
                />
                {a.bucket}: {money(a.amount)}
              </button>
            ))}
          </div>
        </ChartShell>
      </div>

      <div className="mb-6">
        <ArTrendChart
          data={trend}
          rangeLabel={rangeLabel}
          groupBy={trendGroup}
          onGroupByChange={onTrendGroupChange}
          series={trendSeries}
          onSeriesChange={onTrendSeriesChange}
        />
      </div>

      <div className="mb-6">
        <TopClientsChart rows={topClients} onSelectClient={onSelectClient} />
      </div>

      <div className="mb-6">
        <ArPaymentStatusViz
          slices={paymentStatus}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          presetLabel={presetLabel}
          selectedStatus={selectedPaymentStatus}
          onSelectStatus={onSelectPaymentStatus}
          onClearStatus={onClearPaymentStatus}
        />
      </div>

      <div className="mb-6">
        <ChartShell title="Collection Risk" empty={!risks.length}>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th className="text-right">Remaining</th>
                  <th className="text-right">Days past due</th>
                  <th>Risk reasons</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((r) => (
                  <tr key={r.invoiceId}>
                    <td className="font-medium">{r.invoiceNumber}</td>
                    <td>{r.clientName}</td>
                    <td className="text-right tabular-nums">
                      {money(r.remaining)}
                    </td>
                    <td className="text-right tabular-nums">{r.daysPastDue}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {r.reasons.map((reason) => (
                          <span
                            key={reason}
                            className="badge badge-warning badge-sm whitespace-nowrap"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartShell>
      </div>
    </div>
  );
}
