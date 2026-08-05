"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { NamedBarChart } from "@/components/tasks/NamedBarChart";
import { BudgetHealthBadge, EmptyState, StatusBadge } from "@/components/ui";
import { money, num } from "@/lib/format";
import {
  PERIOD_OPTIONS,
  inPeriod,
  rangesOverlap,
  resolvePeriod,
  type PeriodKey,
} from "@/lib/period";

export type CampaignsExplorerSource = {
  campaigns: {
    id: string;
    campaign_name: string;
    campaign_type: string;
    campaign_status: string;
    campaign_budget: number | string;
    client_id: string;
    start_date: string;
    end_date: string | null;
    clients?: { client_name: string } | null;
  }[];
  costs: {
    campaign_id: string | null;
    amount: number | string;
    cost_date: string;
  }[];
};

type SortKey =
  | "name"
  | "client"
  | "type"
  | "status"
  | "budget"
  | "spent"
  | "remaining";

type CampaignRow = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string | null;
  budget: number;
  spent: number;
  remaining: number;
};

export function CampaignsExplorer({
  source,
  initialPeriod = "ytd",
  initialClientId = "all",
}: {
  source: CampaignsExplorerSource;
  initialPeriod?: PeriodKey;
  initialClientId?: string;
}) {
  const [period, setPeriod] = useState<PeriodKey>(initialPeriod);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("all");
  const [clientFilter, setClientFilter] = useState(initialClientId);
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const range = useMemo(
    () => resolvePeriod(period, customStart, customEnd),
    [period, customStart, customEnd],
  );

  const statuses = useMemo(() => {
    const set = new Set(
      source.campaigns.map((c) => c.campaign_status).filter(Boolean),
    );
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [source.campaigns]);

  const types = useMemo(() => {
    const set = new Set(
      source.campaigns.map((c) => c.campaign_type).filter(Boolean),
    );
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [source.campaigns]);

  const campaignOptions = useMemo(
    () =>
      [...source.campaigns]
        .filter((c) => clientFilter === "all" || c.client_id === clientFilter)
        .sort((a, b) => a.campaign_name.localeCompare(b.campaign_name))
        .map((c) => ({ value: c.id, label: c.campaign_name })),
    [source.campaigns, clientFilter],
  );

  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of source.campaigns) {
      map.set(c.client_id, c.clients?.client_name ?? "—");
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [source.campaigns]);

  const rows = useMemo(() => {
    return source.campaigns
      .filter((c) =>
        rangesOverlap(c.start_date, c.end_date, range.start, range.end),
      )
      .map((c): CampaignRow => {
        const spent = source.costs
          .filter(
            (cost) =>
              cost.campaign_id === c.id &&
              inPeriod(cost.cost_date, range.start, range.end),
          )
          .reduce((s, cost) => s + num(cost.amount), 0);
        const budget = num(c.campaign_budget);
        return {
          id: c.id,
          name: c.campaign_name,
          clientId: c.client_id,
          clientName: c.clients?.client_name ?? "—",
          type: c.campaign_type,
          status: c.campaign_status,
          start_date: c.start_date,
          end_date: c.end_date,
          budget,
          spent,
          remaining: budget - spent,
        };
      });
  }, [source, range.start, range.end]);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (clientFilter !== "all") {
      list = list.filter((r) => r.clientId === clientFilter);
    }
    if (selectedId !== "all") {
      list = list.filter((r) => r.id === selectedId);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.clientName.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (typeFilter !== "all") {
      list = list.filter((r) => r.type === typeFilter);
    }
    list.sort((a, b) => {
      switch (sortKey) {
        case "client":
          return a.clientName.localeCompare(b.clientName);
        case "type":
          return a.type.localeCompare(b.type);
        case "status":
          return a.status.localeCompare(b.status);
        case "budget":
          return b.budget - a.budget;
        case "spent":
          return b.spent - a.spent;
        case "remaining":
          return b.remaining - a.remaining;
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [rows, selectedId, clientFilter, query, statusFilter, typeFilter, sortKey]);

  const statusChart = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of filtered) {
      counts.set(c.status, (counts.get(c.status) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  if (!source.campaigns.length) {
    return (
      <EmptyState
        title="No campaigns"
        description="Launch a campaign under an active contract to track work, costs, and billing."
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
              Shows campaigns active in this range; spend uses costs dated in
              period ({range.label}
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

      <div className="grid gap-3 rounded-box border border-base-300 bg-base-100 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <label className="form-control min-w-0">
          <span className="label-text text-xs opacity-70">Client</span>
          <select
            className="select select-bordered select-sm w-full max-w-full"
            value={clientFilter}
            onChange={(e) => {
              setClientFilter(e.target.value);
              setSelectedId("all");
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
          <span className="label-text text-xs opacity-70">Campaign</span>
          <select
            className="select select-bordered select-sm w-full max-w-full"
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              if (e.target.value !== "all") setQuery("");
            }}
          >
            <option value="all">All campaigns</option>
            {campaignOptions.map((o) => (
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
            placeholder="Campaign, client, or type…"
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
          <span className="label-text text-xs opacity-70">Type</span>
          <select
            className="select select-bordered select-sm w-full max-w-full"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
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
            <option value="client">Client (A–Z)</option>
            <option value="type">Type (A–Z)</option>
            <option value="status">Status (A–Z)</option>
            <option value="budget">Budget ↓</option>
            <option value="spent">Spent ↓</option>
            <option value="remaining">Remaining ↓</option>
          </select>
        </label>
      </div>

      {filtered.length ? (
        <div className="mb-2 max-w-xl">
          <NamedBarChart
            title="Campaigns by status"
            data={statusChart}
            color="#818cf8"
          />
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-box border border-base-300">
        <table className="table table-sm">
          <thead className="sticky top-0 z-10 bg-base-100">
            <tr>
              <th>Campaign</th>
              <th>Client</th>
              <th>Type</th>
              <th>Status</th>
              <th className="text-right">Budget</th>
              <th className="text-right">Spent</th>
              <th className="text-right">Remaining</th>
              <th className="min-w-28">Health</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="hover">
                <td>
                  <Link
                    href={`/app/campaigns/${c.id}`}
                    className="link link-hover font-medium"
                  >
                    {c.name}
                  </Link>
                </td>
                <td>
                  <Link
                    href={`/app/clients/${c.clientId}`}
                    className="link link-hover"
                  >
                    {c.clientName}
                  </Link>
                </td>
                <td>{c.type}</td>
                <td className="whitespace-nowrap">
                  <StatusBadge status={c.status} />
                </td>
                <td className="text-right">{money(c.budget)}</td>
                <td className="text-right">{money(c.spent)}</td>
                <td
                  className={`text-right ${c.remaining < 0 ? "text-error" : ""}`}
                >
                  {money(c.remaining)}
                </td>
                <td className="min-w-28 whitespace-normal">
                  <BudgetHealthBadge
                    budget={c.budget}
                    spent={c.spent}
                    showBar
                  />
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm opacity-60">
                  No campaigns match these filters for this period.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
