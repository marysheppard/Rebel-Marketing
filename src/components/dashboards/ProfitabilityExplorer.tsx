"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClientProfitChart } from "@/components/Charts";
import { StatCard } from "@/components/ui";
import { money, num, pct } from "@/lib/format";
import { clientProfitabilityRow } from "@/lib/metrics";

export type ProfitabilitySource = {
  clients: {
    id: string;
    client_name: string;
    status: string;
    account_manager_id: string | null;
  }[];
  campaigns: {
    id: string;
    campaign_name: string;
    client_id: string;
    clients?: { client_name: string } | null;
  }[];
  invoices: {
    client_id: string;
    campaign_id: string | null;
    total_amount: number | string;
    status: string;
    invoice_date: string;
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
    internal_cost_rate?: number | null;
  }[];
};

export type ClientProfitRow = {
  clientId: string;
  name: string;
  revenue: number;
  costs: number;
  laborCost: number;
  otherCosts: number;
  marketingSpend: number;
  profit: number;
  margin: number | null;
  roi: number | null;
  accountManager: string;
  status: string;
};

export type CampaignProfitRow = {
  id: string;
  name: string;
  client: string;
  clientId: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number | null;
  accountManager: string;
};

export type AmProfitRow = {
  name: string;
  revenue: number;
  costs: number;
  profit: number;
};

type Category = "client" | "campaign" | "account_manager";
type SortKey =
  | "name"
  | "revenue"
  | "costs"
  | "profit"
  | "margin"
  | "roi"
  | "labor"
  | "client";
type ProfitFilter = "all" | "profitable" | "unprofitable";
type PeriodKey =
  | "all"
  | "mtd"
  | "last30"
  | "last90"
  | "qtd"
  | "ytd"
  | "custom";

function compareNullable(
  a: number | null,
  b: number | null,
  dir: number,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return (a - b) * dir;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function resolvePeriod(
  period: PeriodKey,
  customStart: string,
  customEnd: string,
): { start: string | null; end: string | null; label: string } {
  const now = new Date();
  const end = toDateStr(now);

  if (period === "all") {
    return { start: null, end: null, label: "All time" };
  }
  if (period === "custom") {
    return {
      start: customStart || null,
      end: customEnd || end,
      label:
        customStart && customEnd
          ? `${customStart} → ${customEnd}`
          : "Custom range",
    };
  }
  if (period === "mtd") {
    const start = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
    return { start, end, label: "Month to date" };
  }
  if (period === "last30") {
    const s = new Date(now);
    s.setDate(s.getDate() - 30);
    return { start: toDateStr(s), end, label: "Last 30 days" };
  }
  if (period === "last90") {
    const s = new Date(now);
    s.setDate(s.getDate() - 90);
    return { start: toDateStr(s), end, label: "Last 90 days" };
  }
  if (period === "qtd") {
    const q = Math.floor(now.getMonth() / 3) * 3;
    const start = toDateStr(new Date(now.getFullYear(), q, 1));
    return { start, end, label: "Quarter to date" };
  }
  const start = toDateStr(new Date(now.getFullYear(), 0, 1));
  return { start, end, label: "Year to date" };
}

function inPeriod(dateStr: string | null | undefined, start: string | null, end: string | null) {
  if (!dateStr) return start == null && end == null;
  if (start && dateStr < start) return false;
  if (end && dateStr > end) return false;
  return true;
}

function buildRows(
  source: ProfitabilitySource,
  start: string | null,
  end: string | null,
  showAccountManagers: boolean,
) {
  const { clients, campaigns, invoices, costs, work, profiles } = source;
  const amNameById = new Map(profiles.map((p) => [p.id, p.full_name]));
  const amNameByClient = new Map(
    clients.map((cl) => [
      cl.id,
      cl.account_manager_id
        ? (amNameById.get(cl.account_manager_id) ?? "Unassigned")
        : "Unassigned",
    ]),
  );
  const campClient = new Map(campaigns.map((c) => [c.id, c.client_id]));
  const rates = new Map(
    profiles.map((p) => [p.id, num(p.internal_cost_rate ?? 75)]),
  );

  const periodInvoices = invoices.filter(
    (i) =>
      !["Draft", "Canceled"].includes(i.status) &&
      inPeriod(i.invoice_date, start, end),
  );
  const periodCosts = costs.filter((c) => inPeriod(c.cost_date, start, end));
  const periodWork = work.filter((w) => inPeriod(w.work_date, start, end));

  const revByClient = new Map<string, number>();
  const revByCampaign = new Map<string, number>();
  for (const i of periodInvoices) {
    const amt = num(i.total_amount);
    revByClient.set(i.client_id, (revByClient.get(i.client_id) ?? 0) + amt);
    if (i.campaign_id) {
      revByCampaign.set(
        i.campaign_id,
        (revByCampaign.get(i.campaign_id) ?? 0) + amt,
      );
    }
  }

  const costByClient = new Map<string, number>();
  const costByCampaign = new Map<string, number>();
  for (const c of periodCosts) {
    const amt = num(c.amount);
    if (c.client_id) {
      costByClient.set(c.client_id, (costByClient.get(c.client_id) ?? 0) + amt);
    } else if (c.campaign_id) {
      const clientId = campClient.get(c.campaign_id);
      if (clientId) {
        costByClient.set(clientId, (costByClient.get(clientId) ?? 0) + amt);
      }
    }
    if (c.campaign_id) {
      costByCampaign.set(
        c.campaign_id,
        (costByCampaign.get(c.campaign_id) ?? 0) + amt,
      );
    }
  }

  const laborByClient = new Map<string, number>();
  for (const w of periodWork) {
    const clientId = campClient.get(w.campaign_id);
    if (!clientId) continue;
    const rate = rates.get(w.user_id) ?? 75;
    laborByClient.set(
      clientId,
      (laborByClient.get(clientId) ?? 0) + num(w.hours) * rate,
    );
  }

  const byClient: ClientProfitRow[] = clients
    .map((cl) => {
      const rev = revByClient.get(cl.id) ?? 0;
      const labor = laborByClient.get(cl.id) ?? 0;
      const direct = costByClient.get(cl.id) ?? 0;
      const row = clientProfitabilityRow(
        cl.id,
        cl.client_name,
        rev,
        direct,
        labor,
        0,
      );
      return {
        ...row,
        accountManager: amNameByClient.get(cl.id) ?? "Unassigned",
        status: cl.status,
      };
    })
    .filter((r) => r.revenue > 0 || r.costs > 0)
    .sort((a, b) => b.profit - a.profit);

  const byCampaign: CampaignProfitRow[] = campaigns
    .map((c) => {
      const rev = revByCampaign.get(c.id) ?? 0;
      const campCosts = costByCampaign.get(c.id) ?? 0;
      return {
        id: c.id,
        name: c.campaign_name,
        client: c.clients?.client_name ?? "—",
        clientId: c.client_id,
        revenue: rev,
        costs: campCosts,
        profit: rev - campCosts,
        margin: rev > 0 ? ((rev - campCosts) / rev) * 100 : null,
        accountManager: amNameByClient.get(c.client_id) ?? "Unassigned",
      };
    })
    .filter((r) => r.revenue > 0 || r.costs > 0)
    .sort((a, b) => b.profit - a.profit);

  const byAm: AmProfitRow[] = showAccountManagers
    ? (() => {
        const map = new Map<string, AmProfitRow>();
        for (const cl of clients) {
          const amId = cl.account_manager_id ?? "unassigned";
          const amName = amNameByClient.get(cl.id) ?? "Unassigned";
          const cur = map.get(amId) ?? {
            name: amName,
            revenue: 0,
            costs: 0,
            profit: 0,
          };
          const row = byClient.find((r) => r.clientId === cl.id);
          if (row) {
            cur.revenue += row.revenue;
            cur.costs += row.costs;
            cur.profit += row.profit;
          }
          map.set(amId, cur);
        }
        return [...map.values()]
          .filter((r) => r.revenue > 0 || r.costs > 0)
          .sort((a, b) => b.profit - a.profit);
      })()
    : [];

  return { byClient, byCampaign, byAm };
}

export function ProfitabilityExplorer({
  source,
  showAccountManagers,
  initialPeriod = "ytd",
  initialClientId,
}: {
  source: ProfitabilitySource;
  showAccountManagers: boolean;
  initialPeriod?: PeriodKey;
  initialClientId?: string;
}) {
  const [period, setPeriod] = useState<PeriodKey>(initialPeriod);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [category, setCategory] = useState<Category>("client");
  const [sortKey, setSortKey] = useState<SortKey>("profit");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [profitFilter, setProfitFilter] = useState<ProfitFilter>("all");
  const [accountManager, setAccountManager] = useState("all");
  const [selectedItem, setSelectedItem] = useState(initialClientId ?? "all");
  const [query, setQuery] = useState("");

  const range = useMemo(
    () => resolvePeriod(period, customStart, customEnd),
    [period, customStart, customEnd],
  );

  const { byClient, byCampaign, byAm } = useMemo(
    () => buildRows(source, range.start, range.end, showAccountManagers),
    [source, range.start, range.end, showAccountManagers],
  );

  const totalRev = byClient.reduce((s, r) => s + r.revenue, 0);
  const totalCost = byClient.reduce((s, r) => s + r.costs, 0);
  const totalProfit = totalRev - totalCost;

  const managers = useMemo(() => {
    const set = new Set<string>();
    for (const r of byClient) {
      if (r.accountManager) set.add(r.accountManager);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [byClient]);

  const searchOptions = useMemo(() => {
    if (category === "client") {
      return [...byClient]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((r) => ({ value: r.clientId, label: r.name }));
    }
    if (category === "campaign") {
      return [...byCampaign]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((r) => ({
          value: r.id,
          label: `${r.name} (${r.client})`,
        }));
    }
    return [...byAm]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((r) => ({ value: r.name, label: r.name }));
  }, [category, byClient, byCampaign, byAm]);

  const searchLabel =
    category === "client"
      ? "Client"
      : category === "campaign"
        ? "Campaign"
        : "Account manager";

  const dir = sortDir === "asc" ? 1 : -1;

  const filteredClients = useMemo(() => {
    let rows = [...byClient];
    if (selectedItem !== "all") {
      if (category === "client") {
        rows = rows.filter((r) => r.clientId === selectedItem);
      } else if (category === "campaign") {
        const camp = byCampaign.find((c) => c.id === selectedItem);
        if (camp) rows = rows.filter((r) => r.clientId === camp.clientId);
      }
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.accountManager.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q),
      );
    }
    if (profitFilter === "profitable") rows = rows.filter((r) => r.profit > 0);
    if (profitFilter === "unprofitable") rows = rows.filter((r) => r.profit <= 0);
    if (accountManager !== "all") {
      rows = rows.filter((r) => r.accountManager === accountManager);
    }
    rows.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "revenue":
          return (a.revenue - b.revenue) * dir;
        case "costs":
          return (a.costs - b.costs) * dir;
        case "labor":
          return (a.laborCost - b.laborCost) * dir;
        case "margin":
          return compareNullable(a.margin, b.margin, dir);
        case "roi":
          return compareNullable(a.roi, b.roi, dir);
        case "profit":
        default:
          return (a.profit - b.profit) * dir;
      }
    });
    return rows;
  }, [
    byClient,
    byCampaign,
    category,
    selectedItem,
    query,
    profitFilter,
    accountManager,
    sortKey,
    dir,
  ]);

  const filteredCampaigns = useMemo(() => {
    let rows = [...byCampaign];
    if (selectedItem !== "all") {
      if (category === "client") {
        rows = rows.filter((r) => r.clientId === selectedItem);
      } else if (category === "campaign") {
        rows = rows.filter((r) => r.id === selectedItem);
      }
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.client.toLowerCase().includes(q) ||
          r.accountManager.toLowerCase().includes(q),
      );
    }
    if (profitFilter === "profitable") rows = rows.filter((r) => r.profit > 0);
    if (profitFilter === "unprofitable") rows = rows.filter((r) => r.profit <= 0);
    if (accountManager !== "all") {
      rows = rows.filter((r) => r.accountManager === accountManager);
    }
    rows.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "client":
          return a.client.localeCompare(b.client) * dir;
        case "revenue":
          return (a.revenue - b.revenue) * dir;
        case "costs":
          return (a.costs - b.costs) * dir;
        case "margin":
          return compareNullable(a.margin, b.margin, dir);
        case "profit":
        default:
          return (a.profit - b.profit) * dir;
      }
    });
    return rows;
  }, [
    byCampaign,
    category,
    selectedItem,
    query,
    profitFilter,
    accountManager,
    sortKey,
    dir,
  ]);

  const filteredAm = useMemo(() => {
    let rows = [...byAm];
    if (category === "account_manager" && selectedItem !== "all") {
      rows = rows.filter((r) => r.name === selectedItem);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    }
    if (profitFilter === "profitable") rows = rows.filter((r) => r.profit > 0);
    if (profitFilter === "unprofitable") rows = rows.filter((r) => r.profit <= 0);
    rows.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "revenue":
          return (a.revenue - b.revenue) * dir;
        case "costs":
          return (a.costs - b.costs) * dir;
        case "profit":
        default:
          return (a.profit - b.profit) * dir;
      }
    });
    return rows;
  }, [byAm, category, selectedItem, query, profitFilter, sortKey, dir]);

  const chartRows =
    category === "client"
      ? filteredClients.map((r) => ({
          name: r.name,
          revenue: r.revenue,
          costs: r.costs,
          profit: r.profit,
        }))
      : category === "campaign"
        ? filteredCampaigns.map((r) => ({
            name: r.name,
            revenue: r.revenue,
            costs: r.costs,
            profit: r.profit,
            subtitle: `Client: ${r.client}`,
          }))
        : filteredAm.map((r) => ({
            name: r.name,
            revenue: r.revenue,
            costs: r.costs,
            profit: r.profit,
          }));

  const sortOptions: { value: SortKey; label: string }[] =
    category === "client"
      ? [
          { value: "profit", label: "Profit" },
          { value: "revenue", label: "Revenue" },
          { value: "costs", label: "Costs" },
          { value: "labor", label: "Labor" },
          { value: "margin", label: "Margin" },
          { value: "roi", label: "ROI" },
          { value: "name", label: "Name" },
        ]
      : category === "campaign"
        ? [
            { value: "profit", label: "Profit" },
            { value: "revenue", label: "Revenue" },
            { value: "costs", label: "Costs" },
            { value: "margin", label: "Margin" },
            { value: "name", label: "Campaign" },
            { value: "client", label: "Client" },
          ]
        : [
            { value: "profit", label: "Profit" },
            { value: "revenue", label: "Revenue" },
            { value: "costs", label: "Costs" },
            { value: "name", label: "Name" },
          ];

  function setCategoryAndSort(next: Category) {
    setCategory(next);
    setSortKey("profit");
    setSortDir("desc");
    setSelectedItem("all");
    setQuery("");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-box border border-base-300 bg-base-100 p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Reporting period</div>
            <div className="text-xs opacity-60">
              Revenue, costs, and profit use this date range ({range.label}
              {range.start || range.end
                ? `: ${range.start ?? "…"} → ${range.end ?? "…"}`
                : ""}
              )
            </div>
          </div>
          <label className="form-control w-full max-w-xs">
            <span className="label-text text-xs opacity-70">Time period</span>
            <select
              className="select select-bordered select-sm w-full"
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodKey)}
            >
              <option value="mtd">Month to date</option>
              <option value="last30">Last 30 days</option>
              <option value="last90">Last 90 days</option>
              <option value="qtd">Quarter to date</option>
              <option value="ytd">Year to date</option>
              <option value="all">All time</option>
              <option value="custom">Custom range</option>
            </select>
          </label>
        </div>
        {period === "custom" ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <label className="form-control">
              <span className="label-text text-xs opacity-70">Start date</span>
              <input
                type="date"
                className="input input-bordered input-sm w-full"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </label>
            <label className="form-control">
              <span className="label-text text-xs opacity-70">End date</span>
              <input
                type="date"
                className="input input-bordered input-sm w-full"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </label>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Revenue"
            value={money(totalRev)}
            hint={range.label}
          />
          <StatCard
            label="Costs"
            value={money(totalCost)}
            hint={range.label}
          />
          <StatCard
            label="Profit"
            value={money(totalProfit)}
            hint={range.label}
            tone={totalProfit >= 0 ? "good" : "bad"}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn btn-sm ${category === "client" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setCategoryAndSort("client")}
        >
          By client
        </button>
        <button
          type="button"
          className={`btn btn-sm ${category === "campaign" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setCategoryAndSort("campaign")}
        >
          By campaign
        </button>
        {showAccountManagers ? (
          <button
            type="button"
            className={`btn btn-sm ${category === "account_manager" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setCategoryAndSort("account_manager")}
          >
            By account manager
          </button>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-3 rounded-box border border-base-300 bg-base-100 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <label className="form-control min-w-0">
          <span className="label-text text-xs opacity-70">{searchLabel}</span>
          <select
            className="select select-bordered select-sm w-full max-w-full"
            value={selectedItem}
            onChange={(e) => {
              setSelectedItem(e.target.value);
              if (e.target.value !== "all") setQuery("");
            }}
          >
            <option value="all">All {searchLabel.toLowerCase()}s</option>
            {searchOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control min-w-0">
          <span className="label-text text-xs opacity-70">Search by name</span>
          <input
            className="input input-bordered input-sm w-full max-w-full"
            placeholder={`Type a ${searchLabel.toLowerCase()} name…`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim()) setSelectedItem("all");
            }}
          />
        </label>
        <label className="form-control min-w-0">
          <span className="label-text text-xs opacity-70">Profitability</span>
          <select
            className="select select-bordered select-sm w-full max-w-full"
            value={profitFilter}
            onChange={(e) => setProfitFilter(e.target.value as ProfitFilter)}
          >
            <option value="all">All</option>
            <option value="profitable">Profitable only</option>
            <option value="unprofitable">Unprofitable only</option>
          </select>
        </label>
        {showAccountManagers && category !== "account_manager" ? (
          <label className="form-control min-w-0">
            <span className="label-text text-xs opacity-70">Account manager</span>
            <select
              className="select select-bordered select-sm w-full max-w-full"
              value={accountManager}
              onChange={(e) => setAccountManager(e.target.value)}
            >
              <option value="all">All managers</option>
              {managers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div />
        )}
        <div className="grid min-w-0 grid-cols-2 gap-2">
          <label className="form-control min-w-0">
            <span className="label-text text-xs opacity-70">Sort by</span>
            <select
              className="select select-bordered select-sm w-full max-w-full"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control min-w-0">
            <span className="label-text text-xs opacity-70">Order</span>
            <select
              className="select select-bordered select-sm w-full max-w-full"
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
            >
              <option value="desc">High → low</option>
              <option value="asc">Low → high</option>
            </select>
          </label>
        </div>
      </div>

      <ClientProfitChart
        title={
          category === "client"
            ? "Profitability by customer"
            : category === "campaign"
              ? "Profitability by campaign"
              : "Profitability by account manager"
        }
        data={chartRows.slice(0, 10).map((r) => ({
          name: r.name,
          revenue: r.revenue,
          costs: r.costs,
          profit: r.profit,
          subtitle:
            "subtitle" in r && typeof r.subtitle === "string"
              ? r.subtitle
              : undefined,
        }))}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-bold">By client</h2>
        <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
          <table className="table">
            <thead>
              <tr>
                <th>Client</th>
                {showAccountManagers ? <th>Account manager</th> : null}
                <th>Revenue</th>
                <th>Labor</th>
                <th>Costs</th>
                <th>Profit</th>
                <th>Margin</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((r) => (
                <tr key={r.clientId}>
                  <td>
                    <Link
                      href={`/app/clients/${r.clientId}`}
                      className="link link-hover font-medium"
                    >
                      {r.name}
                    </Link>
                  </td>
                  {showAccountManagers ? <td>{r.accountManager}</td> : null}
                  <td>{money(r.revenue)}</td>
                  <td>{money(r.laborCost)}</td>
                  <td>{money(r.costs)}</td>
                  <td className={r.profit < 0 ? "text-error" : ""}>
                    {money(r.profit)}
                  </td>
                  <td>{pct(r.margin)}</td>
                  <td>{pct(r.roi)}</td>
                </tr>
              ))}
              {!filteredClients.length ? (
                <tr>
                  <td
                    colSpan={showAccountManagers ? 8 : 7}
                    className="opacity-60"
                  >
                    No clients match these filters for this period.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">By campaign</h2>
        <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Client</th>
                {showAccountManagers ? <th>Account manager</th> : null}
                <th>Revenue</th>
                <th>Costs</th>
                <th>Profit</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link
                      href={`/app/campaigns/${r.id}`}
                      className="link link-hover"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td>{r.client}</td>
                  {showAccountManagers ? <td>{r.accountManager}</td> : null}
                  <td>{money(r.revenue)}</td>
                  <td>{money(r.costs)}</td>
                  <td className={r.profit < 0 ? "text-error" : ""}>
                    {money(r.profit)}
                  </td>
                  <td>{pct(r.margin)}</td>
                </tr>
              ))}
              {!filteredCampaigns.length ? (
                <tr>
                  <td
                    colSpan={showAccountManagers ? 7 : 6}
                    className="opacity-60"
                  >
                    No campaigns match these filters for this period.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {showAccountManagers ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">By account manager</h2>
          <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
            <table className="table">
              <thead>
                <tr>
                  <th>Account manager</th>
                  <th>Revenue</th>
                  <th>Costs</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {filteredAm.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>{money(r.revenue)}</td>
                    <td>{money(r.costs)}</td>
                    <td className={r.profit < 0 ? "text-error" : ""}>
                      {money(r.profit)}
                    </td>
                  </tr>
                ))}
                {!filteredAm.length ? (
                  <tr>
                    <td colSpan={4} className="opacity-60">
                      No account managers match these filters for this period.
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
