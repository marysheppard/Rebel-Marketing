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
import {
  COST_CATEGORIES,
  COST_CATEGORY_COLORS,
  COST_CATEGORY_LABELS,
  type CostCategory,
} from "@/lib/costs/categories";
import type {
  CampaignBudgetRow,
  CampaignSort,
  PassThroughBucketKey,
  TrendPoint,
} from "@/lib/costs/calculations";
import { money, pct } from "@/lib/format";
import { percentOfTotal as pctOf } from "@/lib/costs/calculations";
import {
  TREND_GROUP_LABELS,
  type TrendGroupBy,
  type TrendCategorySelection,
} from "@/lib/costs/filters";

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
          {emptyMessage ?? "No cost records match the selected filters."}
        </div>
      ) : (
        <div className="h-64 w-full">{children}</div>
      )}
    </div>
  );
}

function currencyTooltip(props: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: readonly any[];
  label?: string | number;
}) {
  const { active, payload, label } = props;
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-box border border-base-300 bg-base-100 px-3 py-2 text-xs shadow">
      {label != null ? <div className="mb-1 font-medium">{String(label)}</div> : null}
      {payload.map((p) => (
        <div key={String(p.name)}>
          {p.name}: {money(Number(p.value ?? 0))}
          {typeof p.payload?.count === "number"
            ? ` · ${p.payload.count} records`
            : null}
          {typeof p.payload?.share === "number"
            ? ` · ${pct(p.payload.share as number)}`
            : null}
        </div>
      ))}
    </div>
  );
}

export { CostsByCategoryChart } from "@/components/costs/CostsByCategoryViz";

export function CostTrendChart({
  data,
  rangeLabel,
  groupBy,
  onGroupByChange,
  categories,
  onCategoriesChange,
}: {
  data: TrendPoint[];
  rangeLabel?: string;
  groupBy: TrendGroupBy;
  onGroupByChange: (group: TrendGroupBy) => void;
  categories: TrendCategorySelection;
  onCategoriesChange: (categories: TrendCategorySelection) => void;
}) {
  const pointCount = data.length;
  const tickInterval =
    pointCount <= 12 ? 0 : pointCount <= 24 ? 1 : Math.ceil(pointCount / 12) - 1;
  const minWidth = Math.max(640, pointCount * (pointCount > 36 ? 28 : 40));
  const visibleCategories = COST_CATEGORIES.filter((cat) =>
    categories.includes(cat),
  );

  const categorySummary =
    visibleCategories.length === COST_CATEGORIES.length
      ? "All categories"
      : visibleCategories.length === 0
        ? "No categories"
        : `${visibleCategories.length} of ${COST_CATEGORIES.length} categories`;

  function toggleCategory(cat: CostCategory) {
    if (categories.includes(cat)) {
      onCategoriesChange(categories.filter((c) => c !== cat));
    } else {
      onCategoriesChange(
        COST_CATEGORIES.filter((c) => c === cat || categories.includes(c)),
      );
    }
  }

  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Cost Trend Over Time</h3>
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
              aria-label={`Filter categories: ${categorySummary}`}
            >
              Categories
              <span className="opacity-60">· {categorySummary}</span>
            </div>
            <div
              tabIndex={0}
              className="dropdown-content z-20 mt-1 w-72 rounded-box border border-base-300 bg-base-100 p-3 shadow-lg"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <p className="mb-2 text-xs font-medium opacity-70">
                Show categories
              </p>
              <div className="flex flex-col gap-2" role="group">
                {COST_CATEGORIES.map((cat) => {
                  const checked = categories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-xs hover:bg-base-200"
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={checked}
                        onChange={() => toggleCategory(cat)}
                        aria-label={`Show ${COST_CATEGORY_LABELS[cat]} on trend chart`}
                      />
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: COST_CATEGORY_COLORS[cat] }}
                        aria-hidden
                      />
                      <span>{COST_CATEGORY_LABELS[cat]}</span>
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
                onGroupByChange(e.target.value as TrendGroupBy)
              }
              aria-label="Group cost trend by month, quarter, or year"
            >
              {(Object.keys(TREND_GROUP_LABELS) as TrendGroupBy[]).map((key) => (
                <option key={key} value={key}>
                  {TREND_GROUP_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs opacity-60">
            {pointCount} {TREND_GROUP_LABELS[groupBy].toLowerCase()}
            {pointCount === 1 ? "" : "s"} · empty periods = $0
          </p>
        </div>
      </div>

      {!data.length || visibleCategories.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-sm opacity-60">
          {visibleCategories.length === 0
            ? "Select at least one category to display the trend."
            : "No cost records match the selected filters."}
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
                    const total = payload.reduce(
                      (s, p) => s + Number(p.value ?? 0),
                      0,
                    );
                    return (
                      <div className="rounded-box border border-base-300 bg-base-100 px-3 py-2 text-xs shadow">
                        <div className="mb-1 font-medium">{String(label)}</div>
                        {payload.map((p) => (
                          <div key={String(p.name)}>
                            {p.name}: {money(Number(p.value ?? 0))}
                          </div>
                        ))}
                        {payload.length > 1 ? (
                          <div className="mt-1 border-t border-base-300 pt-1 font-medium">
                            Total: {money(total)}
                          </div>
                        ) : null}
                      </div>
                    );
                  }}
                />
                <Legend />
                {visibleCategories.map((cat) => (
                  <Line
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    name={COST_CATEGORY_LABELS[cat]}
                    stroke={COST_CATEGORY_COLORS[cat]}
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

export function CampaignBudgetChart({
  rows,
  sort,
  onSortChange,
}: {
  rows: CampaignBudgetRow[];
  sort: CampaignSort;
  onSortChange: (sort: CampaignSort) => void;
}) {
  const campaignIds = useMemo(() => rows.map((r) => r.campaignId), [rows]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [campaignSearch, setCampaignSearch] = useState("");
  const userFiltered = useRef(false);

  useEffect(() => {
    setSelectedIds((prev) => {
      const sameAsAll =
        prev.length === campaignIds.length &&
        prev.every((id, i) => id === campaignIds[i]);

      if (!userFiltered.current || prev.length === 0) {
        // Avoid new array identity when contents already match (prevents update loops).
        return sameAsAll ? prev : campaignIds;
      }
      const kept = campaignIds.filter((id) => prev.includes(id));
      const next = kept.length > 0 ? kept : campaignIds;
      if (
        next.length === prev.length &&
        next.every((id, i) => id === prev[i])
      ) {
        return prev;
      }
      return next;
    });
  }, [campaignIds]);

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.includes(r.campaignId)),
    [rows, selectedIds],
  );

  const searchLower = campaignSearch.trim().toLowerCase();
  const searchableRows = useMemo(() => {
    if (!searchLower) return rows;
    return rows.filter((r) => {
      const hay = `${r.clientName} ${r.campaignName}`.toLowerCase();
      return hay.includes(searchLower);
    });
  }, [rows, searchLower]);

  const chartData = selectedRows.map((r) => {
    const fullLabel =
      r.clientName && r.clientName !== "—"
        ? `${r.clientName} · ${r.campaignName}`
        : r.campaignName;
    const label =
      fullLabel.length > 36 ? `${fullLabel.slice(0, 35)}…` : fullLabel;
    return {
      name: label,
      fullName: fullLabel,
      budget: r.budget,
      actual: r.actual,
    };
  });

  const chartHeight = Math.max(280, chartData.length * 48 + 72);
  const allSelected =
    rows.length > 0 && selectedIds.length === rows.length;
  const campaignSummary = allSelected
    ? "All campaigns"
    : selectedIds.length === 0
      ? "No campaigns"
      : `${selectedIds.length} of ${rows.length} campaigns`;

  function toggleCampaign(id: string) {
    userFiltered.current = true;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectAllVisible() {
    userFiltered.current = true;
    const visibleIds = searchableRows.map((r) => r.campaignId);
    setSelectedIds((prev) => {
      const set = new Set(prev);
      for (const id of visibleIds) set.add(id);
      return campaignIds.filter((id) => set.has(id));
    });
  }

  function clearVisible() {
    userFiltered.current = true;
    const visible = new Set(searchableRows.map((r) => r.campaignId));
    setSelectedIds((prev) => prev.filter((id) => !visible.has(id)));
  }

  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Campaign Cost vs. Budget</h3>
          {rows.length > 0 ? (
            <p className="text-xs opacity-60">
              {selectedRows.length} of {rows.length} campaign
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
              aria-label={`Filter campaigns: ${campaignSummary}`}
            >
              Campaigns
              <span className="opacity-60">· {campaignSummary}</span>
            </div>
            <div
              tabIndex={0}
              className="dropdown-content z-20 mt-1 w-80 rounded-box border border-base-300 bg-base-100 p-3 shadow-lg"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <label className="mb-2 block">
                <span className="sr-only">Search campaigns</span>
                <input
                  type="search"
                  className="input input-bordered input-xs w-full"
                  placeholder="Search campaigns…"
                  value={campaignSearch}
                  onChange={(e) => setCampaignSearch(e.target.value)}
                  aria-label="Search campaigns"
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
                aria-label="Campaigns to include in chart"
              >
                {searchableRows.length === 0 ? (
                  <p className="px-1 py-2 text-xs opacity-60">
                    No campaigns match “{campaignSearch.trim()}”.
                  </p>
                ) : (
                  searchableRows.map((r) => {
                    const checked = selectedIds.includes(r.campaignId);
                    const label =
                      r.clientName && r.clientName !== "—"
                        ? `${r.clientName} · ${r.campaignName}`
                        : r.campaignName;
                    return (
                      <label
                        key={r.campaignId}
                        className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-1.5 text-xs hover:bg-base-200"
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs mt-0.5"
                          checked={checked}
                          onChange={() => toggleCampaign(r.campaignId)}
                          aria-label={`Include ${label} on chart`}
                        />
                        <span className="min-w-0 leading-snug">{label}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <span className="opacity-70">Sort</span>
            <select
              className="select select-bordered select-xs"
              value={sort}
              onChange={(e) => onSortChange(e.target.value as CampaignSort)}
              aria-label="Sort campaigns by cost or budget"
            >
              <option value="highest_cost">Highest total cost</option>
              <option value="highest_utilization">
                Highest budget utilization
              </option>
              <option value="largest_over">Largest over-budget amount</option>
              <option value="largest_remaining">
                Largest remaining budget
              </option>
            </select>
          </label>
        </div>
      </div>

      {!rows.length ? (
        <div className="flex h-56 items-center justify-center text-sm opacity-60">
          No approved campaign budget is available for the selected filters.
        </div>
      ) : selectedRows.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-sm opacity-60">
          Select at least one campaign to display the chart.
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
                  dataKey="name"
                  width={170}
                  interval={0}
                  tickMargin={8}
                  tick={{ fontSize: 10, fill: "currentColor" }}
                />
                <Tooltip
                  content={(props) => {
                    const { active, payload } = props;
                    if (!active || !payload?.length) return null;
                    const fullName =
                      (payload[0]?.payload as { fullName?: string } | undefined)
                        ?.fullName ?? "";
                    return (
                      <div className="rounded-box border border-base-300 bg-base-100 px-3 py-2 text-xs shadow">
                        {fullName ? (
                          <div className="mb-1 max-w-[16rem] font-medium">
                            {fullName}
                          </div>
                        ) : null}
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
                <Bar
                  dataKey="budget"
                  name="Approved budget"
                  fill="oklch(55% 0.02 250)"
                />
                <Bar
                  dataKey="actual"
                  name="Actual approved cost"
                  fill="oklch(65% 0.14 250)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export function ApprovalStatusChart({
  approved,
  pending,
  onSelect,
}: {
  approved: { amount: number; count: number };
  pending: { amount: number; count: number };
  onSelect: (approval: "approved" | "pending") => void;
}) {
  const data = [
    {
      name: "Approved",
      value: approved.amount,
      count: approved.count,
      key: "approved" as const,
    },
    {
      name: "Pending",
      value: pending.amount,
      count: pending.count,
      key: "pending" as const,
    },
  ];
  const empty = approved.count + pending.count === 0;

  return (
    <ChartShell
      title="Cost Approval Status"
      empty={empty}
      emptyMessage="No cost records match the selected filters."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={(v) => `$${v}`} />
          <Tooltip content={currencyTooltip} />
          <Bar
            dataKey="value"
            name="Amount"
            fill="oklch(65% 0.1 220)"
            cursor="pointer"
            onClick={(entry) => {
              const key = (entry as { key?: "approved" | "pending" }).key;
              if (key) onSelect(key);
            }}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap gap-3 text-xs opacity-70">
        <button type="button" className="link link-hover" onClick={() => onSelect("approved")}>
          Approved: {money(approved.amount)} · {approved.count} records
        </button>
        <button type="button" className="link link-hover" onClick={() => onSelect("pending")}>
          Pending: {money(pending.amount)} · {pending.count} records
        </button>
        <span>Rejected / Draft: not stored on cost records (boolean approval only)</span>
      </div>
    </ChartShell>
  );
}

const PT_LABELS: Record<PassThroughBucketKey, string> = {
  awaiting_approval: "Awaiting approval",
  ready_to_bill: "Approved and ready to bill",
  draft_invoice: "Included in draft invoice (approx.)",
  invoiced: "Invoiced (approx.)",
  paid: "Paid (approx.)",
  billing_hold: "On billing hold",
  not_billable: "Not billable",
};

export function PassThroughStatusChart({
  buckets,
  reimbursableTotal,
  notYetBilled,
  onSelectBilling,
}: {
  buckets: Record<PassThroughBucketKey, { amount: number; count: number }>;
  reimbursableTotal: number;
  notYetBilled: number;
  onSelectBilling: (billing: PassThroughBucketKey) => void;
}) {
  const data = (Object.keys(buckets) as PassThroughBucketKey[])
    .map((key) => ({
      key,
      name: PT_LABELS[key],
      value: buckets[key].amount,
      count: buckets[key].count,
      share: pctOf(buckets[key].amount, reimbursableTotal),
    }))
    .filter((d) => d.count > 0 || d.value > 0);

  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
      <h3 className="mb-1 font-semibold">Pass-Through Expense Status</h3>
      <p className="mb-3 text-xs opacity-60">
        Billing buckets for draft/invoiced/paid are approximate (invoice headers only; no line items).
      </p>
      <div className="mb-4 rounded-box border border-warning/30 bg-warning/5 px-3 py-2 text-sm">
        <span className="font-medium">Approved Pass-Through Costs Not Yet Billed:</span>{" "}
        {money(notYetBilled)}
      </div>
      {!data.length ? (
        <div className="flex h-40 items-center justify-center text-sm opacity-60">
          No pass-through expenses match the selected filters.
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis type="number" tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10 }} />
              <Tooltip content={currencyTooltip} />
              <Bar
                dataKey="value"
                name="Amount"
                fill="oklch(72% 0.1 300)"
                cursor="pointer"
                onClick={(entry) => {
                  const key = (entry as { key?: PassThroughBucketKey }).key;
                  if (key) onSelectBilling(key);
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <ul className="mt-2 space-y-1 text-xs opacity-70">
        {data.map((d) => (
          <li key={d.key}>
            <button
              type="button"
              className="link link-hover"
              onClick={() => onSelectBilling(d.key)}
            >
              {d.name}: {money(d.value)} · {d.count} · {pct(d.share)} of reimbursable
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
