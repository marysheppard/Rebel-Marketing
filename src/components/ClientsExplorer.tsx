"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, StatusBadge } from "@/components/ui";
import { money, num } from "@/lib/format";
import { remainingBalance } from "@/lib/finance";
import {
  PERIOD_OPTIONS,
  inPeriod,
  resolvePeriod,
  type PeriodKey,
} from "@/lib/period";

export type ClientsExplorerSource = {
  clients: {
    id: string;
    client_name: string;
    industry: string | null;
    status: string;
    created_at: string;
    customer_id?: string | null;
  }[];
  campaigns: { id: string; client_id: string }[];
  invoices: {
    client_id: string;
    total_amount: number | string;
    status: string;
    invoice_date: string;
    payments?: { amount: number | string }[] | null;
  }[];
  costs: {
    campaign_id: string | null;
    client_id: string | null;
    amount: number | string;
    cost_date: string;
  }[];
};

type SortKey =
  | "name"
  | "industry"
  | "status"
  | "revenue"
  | "costs"
  | "profit"
  | "outstanding";

type ClientRow = {
  id: string;
  name: string;
  customerId: string;
  industry: string;
  status: string;
  created_at: string;
  revenue: number;
  costs: number;
  profit: number;
  outstanding: number;
};

export function ClientsExplorer({
  source,
  initialPeriod = "ytd",
}: {
  source: ClientsExplorerSource;
  initialPeriod?: PeriodKey;
}) {
  const [period, setPeriod] = useState<PeriodKey>(initialPeriod);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const range = useMemo(
    () => resolvePeriod(period, customStart, customEnd),
    [period, customStart, customEnd],
  );

  const statuses = useMemo(() => {
    const set = new Set(source.clients.map((c) => c.status).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [source.clients]);

  const clientOptions = useMemo(
    () =>
      [...source.clients]
        .sort((a, b) => a.client_name.localeCompare(b.client_name))
        .map((c) => ({ value: c.id, label: c.client_name })),
    [source.clients],
  );

  const rows = useMemo(() => {
    const campByClient = new Map<string, string[]>();
    for (const c of source.campaigns) {
      const arr = campByClient.get(c.client_id) ?? [];
      arr.push(c.id);
      campByClient.set(c.client_id, arr);
    }

    return source.clients.map((cl): ClientRow => {
      const campIds = new Set(campByClient.get(cl.id) ?? []);
      const revenue = source.invoices
        .filter(
          (i) =>
            i.client_id === cl.id &&
            !["Draft", "Canceled"].includes(i.status) &&
            inPeriod(i.invoice_date, range.start, range.end),
        )
        .reduce((s, i) => s + num(i.total_amount), 0);
      const clientCosts = source.costs
        .filter(
          (c) =>
            ((c.campaign_id && campIds.has(c.campaign_id)) ||
              c.client_id === cl.id) &&
            inPeriod(c.cost_date, range.start, range.end),
        )
        .reduce((s, c) => s + num(c.amount), 0);
      const outstanding = source.invoices
        .filter(
          (i) =>
            i.client_id === cl.id &&
            inPeriod(i.invoice_date, range.start, range.end),
        )
        .reduce((s, i) => s + remainingBalance(i), 0);
      return {
        id: cl.id,
        name: cl.client_name,
        customerId: cl.customer_id || "",
        industry: cl.industry || "—",
        status: cl.status,
        created_at: cl.created_at,
        revenue,
        costs: clientCosts,
        profit: revenue - clientCosts,
        outstanding,
      };
    });
  }, [source, range.start, range.end]);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (selectedId !== "all") {
      list = list.filter((r) => r.id === selectedId);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.industry.toLowerCase().includes(q) ||
          r.customerId.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    list.sort((a, b) => {
      switch (sortKey) {
        case "industry":
          return a.industry.localeCompare(b.industry);
        case "status":
          return a.status.localeCompare(b.status);
        case "revenue":
          return b.revenue - a.revenue;
        case "costs":
          return b.costs - a.costs;
        case "profit":
          return b.profit - a.profit;
        case "outstanding":
          return b.outstanding - a.outstanding;
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [rows, selectedId, query, statusFilter, sortKey]);

  if (!source.clients.length) {
    return (
      <EmptyState
        title="No clients yet"
        description="Add your first client to start tracking contracts, campaigns, and billing."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-box border border-base-300 bg-base-100 p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Reporting period</div>
            <div className="text-xs opacity-60">
              Revenue, costs, profit, and outstanding use this date range (
              {range.label}
              {range.start || range.end
                ? `: ${range.start ?? "…"} → ${range.end ?? "…"}`
                : ""}
              )
            </div>
          </div>
          <label className="form-control w-full min-w-0 max-w-xs">
            <span className="label-text text-xs opacity-70">Time period</span>
            <select
              className="select select-bordered select-sm w-full max-w-full"
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodKey)}
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {period === "custom" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="form-control min-w-0">
              <span className="label-text text-xs opacity-70">Start date</span>
              <input
                type="date"
                className="input input-bordered input-sm w-full max-w-full"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </label>
            <label className="form-control min-w-0">
              <span className="label-text text-xs opacity-70">End date</span>
              <input
                type="date"
                className="input input-bordered input-sm w-full max-w-full"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-box border border-base-300 bg-base-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="form-control min-w-0">
          <span className="label-text text-xs opacity-70">Client</span>
          <select
            className="select select-bordered select-sm w-full max-w-full"
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              if (e.target.value !== "all") setQuery("");
            }}
          >
            <option value="all">All clients</option>
            {clientOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control min-w-0">
          <span className="label-text text-xs opacity-70">Search</span>
          <input
            className="input input-bordered input-sm w-full max-w-full"
            placeholder="Name, industry, customer ID…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim()) setSelectedId("all");
            }}
          />
        </label>
        <label className="form-control min-w-0">
          <span className="label-text text-xs opacity-70">Status</span>
          <select
            className="select select-bordered select-sm w-full max-w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control min-w-0">
          <span className="label-text text-xs opacity-70">Sort by</span>
          <select
            className="select select-bordered select-sm w-full max-w-full"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="name">Name (A–Z)</option>
            <option value="industry">Industry (A–Z)</option>
            <option value="status">Status (A–Z)</option>
            <option value="revenue">Revenue ↓</option>
            <option value="costs">Costs ↓</option>
            <option value="profit">Profit ↓</option>
            <option value="outstanding">Outstanding ↓</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-box border border-base-300">
        <table className="table table-sm">
          <thead className="sticky top-0 z-10 bg-base-100">
            <tr>
              <th>Client</th>
              <th>Customer ID</th>
              <th>Industry</th>
              <th>Status</th>
              <th className="text-right">Revenue</th>
              <th className="text-right">Costs</th>
              <th className="text-right">Profit</th>
              <th className="text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((cl) => (
              <tr key={cl.id} className="hover">
                <td>
                  <Link
                    href={`/app/clients/${cl.id}`}
                    className="link link-hover font-medium"
                  >
                    {cl.name}
                  </Link>
                </td>
                <td className="font-mono text-xs">{cl.customerId || "—"}</td>
                <td>{cl.industry}</td>
                <td>
                  <StatusBadge status={cl.status} />
                </td>
                <td className="text-right">{money(cl.revenue)}</td>
                <td className="text-right">{money(cl.costs)}</td>
                <td
                  className={`text-right ${cl.profit >= 0 ? "text-success" : "text-error"}`}
                >
                  {money(cl.profit)}
                </td>
                <td className="text-right">{money(cl.outstanding)}</td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm opacity-60">
                  No clients match these filters for this period.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
