"use client";

import { useMemo, useState } from "react";
import { money, moneyExact } from "@/lib/format";

export type CampaignBreakdownRow = {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  spend: number;
  cpc: number;
  cpa: number;
};

type SortKey =
  | "name"
  | "impressions"
  | "clicks"
  | "ctr"
  | "conversions"
  | "spend"
  | "cpc"
  | "cpa";

type ActivityFilter = "all" | "spend" | "conversions" | "clicks" | "impressions";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Campaign name" },
  { value: "impressions", label: "Impressions" },
  { value: "clicks", label: "Clicks" },
  { value: "ctr", label: "CTR" },
  { value: "conversions", label: "Conversions" },
  { value: "spend", label: "Spend" },
  { value: "cpc", label: "CPC" },
  { value: "cpa", label: "CPA" },
];

function sortRows(
  list: CampaignBreakdownRow[],
  sortKey: SortKey,
  sortDir: "asc" | "desc",
) {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    if (sortKey === "name") {
      return a.name.localeCompare(b.name) * dir;
    }
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av === bv) return a.name.localeCompare(b.name);
    return (av - bv) * dir;
  });
}

export function CampaignBreakdownTable({
  rows,
  periodLabel,
}: {
  rows: CampaignBreakdownRow[];
  periodLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [activity, setActivity] = useState<ActivityFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("clicks");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    let list = [...rows];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    switch (activity) {
      case "spend":
        list = list.filter((r) => r.spend > 0);
        break;
      case "conversions":
        list = list.filter((r) => r.conversions > 0);
        break;
      case "clicks":
        list = list.filter((r) => r.clicks > 0);
        break;
      case "impressions":
        list = list.filter((r) => r.impressions > 0);
        break;
      default:
        break;
    }
    return sortRows(list, sortKey, sortDir);
  }, [rows, query, activity, sortKey, sortDir]);

  const hasFilters = query.trim() !== "" || activity !== "all";

  return (
    <section>
      <h3 className="mb-1 text-lg font-bold">Campaign breakdown</h3>
      {periodLabel ? (
        <p className="mb-3 text-xs opacity-60">{periodLabel}</p>
      ) : null}

      <div className="mb-3 grid gap-3 rounded-box border border-base-300 bg-base-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="form-control min-w-0 sm:col-span-2 lg:col-span-1">
          <span className="label-text text-xs opacity-70">Search</span>
          <input
            className="input input-bordered input-sm w-full"
            placeholder="Campaign name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="form-control min-w-0">
          <span className="label-text text-xs opacity-70">Activity</span>
          <select
            className="select select-bordered select-sm w-full"
            value={activity}
            onChange={(e) => setActivity(e.target.value as ActivityFilter)}
          >
            <option value="all">All campaigns</option>
            <option value="impressions">Has impressions</option>
            <option value="clicks">Has clicks</option>
            <option value="conversions">Has conversions</option>
            <option value="spend">Has spend</option>
          </select>
        </label>
        <label className="form-control min-w-0">
          <span className="label-text text-xs opacity-70">Sort by</span>
          <select
            className="select select-bordered select-sm w-full"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control min-w-0">
          <span className="label-text text-xs opacity-70">Order</span>
          <select
            className="select select-bordered select-sm w-full"
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
          >
            <option value="desc">High to low</option>
            <option value="asc">Low to high</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
        <table className="table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th className="text-right">Impressions</th>
              <th className="text-right">Clicks</th>
              <th className="text-right">CTR</th>
              <th className="text-right">Conversions</th>
              <th className="text-right">Spend</th>
              <th className="text-right">CPC</th>
              <th className="text-right">CPA</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-sm opacity-60">
                  {hasFilters
                    ? "No campaigns match the current filters."
                    : periodLabel
                      ? `No campaign metrics in ${periodLabel.toLowerCase()}.`
                      : "No campaign metrics yet."}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.name}</td>
                  <td className="text-right">
                    {r.impressions.toLocaleString()}
                  </td>
                  <td className="text-right">{r.clicks.toLocaleString()}</td>
                  <td className="text-right">{r.ctr}%</td>
                  <td className="text-right">
                    {r.conversions.toLocaleString()}
                  </td>
                  <td className="text-right">{money(r.spend)}</td>
                  <td className="text-right">
                    {r.clicks > 0 ? moneyExact(r.cpc) : "—"}
                  </td>
                  <td className="text-right">
                    {r.conversions > 0 ? moneyExact(r.cpa) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {hasFilters && filtered.length > 0 ? (
        <p className="mt-2 text-xs opacity-60">
          Showing {filtered.length} of {rows.length} campaigns
        </p>
      ) : null}
    </section>
  );
}
