"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { money, pct } from "@/lib/format";
import { CollapsibleSection } from "@/components/reports/CollapsibleSection";
import type {
  ApprovalPerf,
  BillingPerf,
  BudgetRow,
  ProfitRow,
  UnbilledRow,
} from "@/components/reports/types";

type SortDir = "asc" | "desc";

function SortHeader({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <th className={align === "right" ? "text-right" : undefined}>
      <button
        type="button"
        className={`btn btn-ghost btn-xs font-semibold ${align === "right" ? "ml-auto" : ""}`}
        onClick={onClick}
      >
        {label}
        {active ? (dir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );
}

function MicroBar({
  value,
  max,
  tone,
}: {
  value: number;
  max: number;
  tone: "good" | "bad" | "warn" | "neutral";
}) {
  const width = max > 0 ? Math.min(100, Math.round((Math.abs(value) / max) * 100)) : 0;
  const color =
    tone === "good"
      ? "bg-success"
      : tone === "bad"
        ? "bg-error"
        : tone === "warn"
          ? "bg-warning"
          : "bg-primary";
  return (
    <div className="mt-1 h-1.5 w-full max-w-[7rem] rounded-full bg-base-300 ml-auto">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function ClientProfitTable({ rows }: { rows: ProfitRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "profit" | "loss">("all");
  const [sortKey, setSortKey] = useState<"name" | "revenue" | "costs" | "profit" | "margin">(
    "profit",
  );
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const maxAbsProfit = useMemo(
    () => Math.max(1, ...rows.map((r) => Math.abs(r.profit))),
    [rows],
  );

  const underwater = rows.filter((r) => r.profit < 0).length;

  const list = useMemo(() => {
    let next = [...rows];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      next = next.filter((r) => r.name.toLowerCase().includes(q));
    }
    if (filter === "profit") next = next.filter((r) => r.profit > 0);
    if (filter === "loss") next = next.filter((r) => r.profit < 0);
    next.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc"
        ? Number(av) - Number(bv)
        : Number(bv) - Number(av);
    });
    return next;
  }, [rows, query, filter, sortKey, sortDir]);

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "asc");
    }
  }

  return (
    <CollapsibleSection
      id="client-profit"
      title="Client profitability"
      subtitle="Revenue, cost, and margin by account"
      summary={`${rows.length} accounts · ${underwater} underwater`}
    >
      <div className="flex flex-wrap gap-2 border-b border-base-300 px-4 py-3 sm:px-5">
        <input
          className="input input-bordered input-sm w-44"
          placeholder="Search clients"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="select select-bordered select-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
        >
          <option value="all">All</option>
          <option value="profit">Profitable</option>
          <option value="loss">Underwater</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead className="bg-base-200/60 text-xs uppercase tracking-wide">
            <tr>
              <SortHeader
                label="Client"
                active={sortKey === "name"}
                dir={sortDir}
                onClick={() => toggleSort("name")}
              />
              <SortHeader
                label="Revenue"
                active={sortKey === "revenue"}
                dir={sortDir}
                onClick={() => toggleSort("revenue")}
                align="right"
              />
              <SortHeader
                label="Costs"
                active={sortKey === "costs"}
                dir={sortDir}
                onClick={() => toggleSort("costs")}
                align="right"
              />
              <SortHeader
                label="Profit"
                active={sortKey === "profit"}
                dir={sortDir}
                onClick={() => toggleSort("profit")}
                align="right"
              />
              <SortHeader
                label="Margin"
                active={sortKey === "margin"}
                dir={sortDir}
                onClick={() => toggleSort("margin")}
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-base-200/40">
                <td>
                  <Link href={`/app/clients/${r.id}`} className="link link-hover font-medium">
                    {r.name}
                  </Link>
                </td>
                <td className="text-right tabular-nums">{money(r.revenue)}</td>
                <td className="text-right tabular-nums">{money(r.costs)}</td>
                <td
                  className={`text-right tabular-nums font-semibold ${
                    r.profit >= 0 ? "text-success" : "text-error"
                  }`}
                >
                  {money(r.profit)}
                  <MicroBar
                    value={r.profit}
                    max={maxAbsProfit}
                    tone={r.profit >= 0 ? "good" : "bad"}
                  />
                </td>
                <td className="text-right tabular-nums">{pct(r.margin)}</td>
              </tr>
            ))}
            {!list.length ? (
              <tr>
                <td colSpan={5} className="text-center opacity-60">
                  No matching client profitability rows.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </CollapsibleSection>
  );
}

export function CampaignProfitTable({ rows }: { rows: ProfitRow[] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<"profit" | "margin" | "name">("margin");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const list = useMemo(() => {
    let next = [...rows];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      next = next.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.client ?? "").toLowerCase().includes(q),
      );
    }
    next.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
    return next;
  }, [rows, query, sortKey, sortDir]);

  return (
    <CollapsibleSection
      title="Campaign profitability"
      subtitle="Where delivery dollars turn into margin"
      summary={`${rows.length} campaigns with activity`}
    >
      <div className="flex flex-wrap gap-2 border-b border-base-300 px-4 py-3 sm:px-5">
        <input
          className="input input-bordered input-sm w-48"
          placeholder="Search campaign or client"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="select select-bordered select-sm"
          value={`${sortKey}:${sortDir}`}
          onChange={(e) => {
            const [k, d] = e.target.value.split(":") as [typeof sortKey, SortDir];
            setSortKey(k);
            setSortDir(d);
          }}
        >
          <option value="margin:asc">Worst margin first</option>
          <option value="margin:desc">Best margin first</option>
          <option value="profit:asc">Lowest profit first</option>
          <option value="profit:desc">Highest profit first</option>
          <option value="name:asc">Name A–Z</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead className="bg-base-200/60 text-xs uppercase tracking-wide">
            <tr>
              <th>Campaign</th>
              <th>Client</th>
              <th className="text-right">Revenue</th>
              <th className="text-right">Costs</th>
              <th className="text-right">Profit</th>
              <th className="text-right">Margin</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-base-200/40">
                <td>
                  <Link href={`/app/campaigns/${r.id}`} className="link link-hover font-medium">
                    {r.name}
                  </Link>
                </td>
                <td className="opacity-80">{r.client ?? "—"}</td>
                <td className="text-right tabular-nums">{money(r.revenue)}</td>
                <td className="text-right tabular-nums">{money(r.costs)}</td>
                <td
                  className={`text-right tabular-nums font-semibold ${
                    r.profit >= 0 ? "text-success" : "text-error"
                  }`}
                >
                  {money(r.profit)}
                </td>
                <td className="text-right tabular-nums">{pct(r.margin)}</td>
              </tr>
            ))}
            {!list.length ? (
              <tr>
                <td colSpan={6} className="text-center opacity-60">
                  No matching campaign profitability rows.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </CollapsibleSection>
  );
}

export function BudgetTable({ rows }: { rows: BudgetRow[] }) {
  const [health, setHealth] = useState<"all" | "under" | "near" | "over">("all");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const over = rows.filter((r) => r.health === "over").length;
  const near = rows.filter((r) => r.health === "near").length;

  const list = useMemo(() => {
    let next = [...rows];
    if (health !== "all") next = next.filter((r) => r.health === health);
    next.sort((a, b) =>
      sortDir === "desc" ? b.pctUsed - a.pctUsed : a.pctUsed - b.pctUsed,
    );
    return next;
  }, [rows, health, sortDir]);

  return (
    <CollapsibleSection
      id="budget"
      title="Budget performance"
      subtitle="Spend vs approved campaign budgets"
      summary={`${rows.length} budgeted · ${over} over · ${near} near`}
    >
      <div className="flex flex-wrap gap-2 border-b border-base-300 px-4 py-3 sm:px-5">
        <select
          className="select select-bordered select-sm"
          value={health}
          onChange={(e) => setHealth(e.target.value as typeof health)}
        >
          <option value="all">All health</option>
          <option value="over">Over</option>
          <option value="near">Near</option>
          <option value="under">Under</option>
        </select>
        <select
          className="select select-bordered select-sm"
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value as SortDir)}
        >
          <option value="desc">Highest % used</option>
          <option value="asc">Lowest % used</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead className="bg-base-200/60 text-xs uppercase tracking-wide">
            <tr>
              <th>Campaign</th>
              <th className="text-right">Budget</th>
              <th className="text-right">Spent</th>
              <th className="text-right">Variance</th>
              <th className="min-w-[9rem]">Utilization</th>
              <th>Health</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-base-200/40">
                <td>
                  <Link href={`/app/campaigns/${r.id}`} className="link link-hover font-medium">
                    {r.name}
                  </Link>
                  <div className="mt-1 h-1.5 w-full max-w-xs rounded-full bg-base-300">
                    <div
                      className={`h-1.5 rounded-full ${
                        r.health === "over"
                          ? "bg-error"
                          : r.health === "near"
                            ? "bg-warning"
                            : "bg-success"
                      }`}
                      style={{ width: `${Math.min(100, Math.round(r.pctUsed))}%` }}
                    />
                  </div>
                </td>
                <td className="text-right tabular-nums">{money(r.budget)}</td>
                <td className="text-right tabular-nums">{money(r.spent)}</td>
                <td
                  className={`text-right tabular-nums ${
                    r.variance < 0 ? "text-error font-semibold" : "text-success"
                  }`}
                >
                  {money(r.variance)}
                </td>
                <td className="tabular-nums text-sm opacity-80">
                  {Math.round(r.pctUsed)}%
                </td>
                <td>
                  <span
                    className={`badge badge-sm ${
                      r.health === "over"
                        ? "badge-error"
                        : r.health === "near"
                          ? "badge-warning"
                          : "badge-success"
                    }`}
                  >
                    {r.health === "over" ? "Over" : r.health === "near" ? "Near" : "Under"}
                  </span>
                </td>
              </tr>
            ))}
            {!list.length ? (
              <tr>
                <td colSpan={6} className="text-center opacity-60">
                  No budgeted campaigns match.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </CollapsibleSection>
  );
}

export function BillingApprovalCards({
  billing,
  approvals,
  unbilled,
}: {
  billing: BillingPerf;
  approvals: ApprovalPerf;
  unbilled: UnbilledRow[];
}) {
  const cashTotal =
    billing.collected + billing.outstanding > 0
      ? billing.collected + billing.outstanding
      : 1;
  const collectedPct = Math.round((billing.collected / cashTotal) * 100);
  const unbilledHours = unbilled.reduce((s, r) => s + r.hours, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2" id="approvals">
      <CollapsibleSection
        title="Billing performance"
        subtitle="Cash collected vs still open"
        summary={`${money(billing.outstanding)} outstanding · ${money(billing.overdue)} overdue`}
        className="shadow-sm"
      >
        <div className="px-4 pb-5 sm:px-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-box border border-base-300 bg-base-200/30 p-3">
              <div className="text-xs uppercase opacity-55">Invoiced</div>
              <div className="mt-1 text-xl font-bold tabular-nums">{money(billing.total)}</div>
            </div>
            <div className="rounded-box border border-success/30 bg-success/5 p-3">
              <div className="text-xs uppercase opacity-55">Collected</div>
              <div className="mt-1 text-xl font-bold tabular-nums text-success">
                {money(billing.collected)}
              </div>
            </div>
            <div className="rounded-box border border-warning/30 bg-warning/5 p-3">
              <div className="text-xs uppercase opacity-55">Outstanding</div>
              <div className="mt-1 text-xl font-bold tabular-nums text-warning">
                {money(billing.outstanding)}
              </div>
            </div>
            <div className="rounded-box border border-error/30 bg-error/5 p-3">
              <div className="text-xs uppercase opacity-55">Overdue</div>
              <div className="mt-1 text-xl font-bold tabular-nums text-error">
                {money(billing.overdue)}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs opacity-60">
              <span>Collection rate</span>
              <span>{collectedPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-base-300">
              <div
                className="h-2 rounded-full bg-success"
                style={{ width: `${collectedPct}%` }}
              />
            </div>
            <p className="mt-2 text-xs opacity-60">
              {billing.disputed} disputed invoice{billing.disputed === 1 ? "" : "s"}
            </p>
          </div>
          <Link href="/app/ar" className="btn btn-outline btn-sm mt-4">
            Open AR
          </Link>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Approval + unbilled"
        subtitle="Pipeline health and invoice-ready work"
        summary={`${approvals.pending} pending · ${unbilledHours.toFixed(1)}h unbilled`}
        className="shadow-sm"
      >
        <div className="px-4 pb-5 sm:px-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-box border border-base-300 p-3">
              <div className="text-xs uppercase opacity-55">Pending</div>
              <div className="mt-1 text-xl font-bold text-warning">{approvals.pending}</div>
            </div>
            <div className="rounded-box border border-base-300 p-3">
              <div className="text-xs uppercase opacity-55">Approved</div>
              <div className="mt-1 text-xl font-bold text-success">{approvals.approved}</div>
            </div>
            <div className="rounded-box border border-base-300 p-3">
              <div className="text-xs uppercase opacity-55">Rejected</div>
              <div className="mt-1 text-xl font-bold text-error">{approvals.rejected}</div>
            </div>
            <div className="rounded-box border border-base-300 p-3">
              <div className="text-xs uppercase opacity-55">Avg wait</div>
              <div className="mt-1 text-xl font-bold">
                {approvals.avgWaitDays == null
                  ? "—"
                  : `${approvals.avgWaitDays.toFixed(1)}d`}
              </div>
            </div>
          </div>
          <div className="mt-4 max-h-40 overflow-y-auto rounded-box border border-base-300">
            <table className="table table-xs">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th className="text-right">Hours</th>
                </tr>
              </thead>
              <tbody>
                {unbilled.slice(0, 6).map((u) => (
                  <tr key={u.campaignId}>
                    <td>
                      <Link
                        href={`/app/campaigns/${u.campaignId}`}
                        className="link link-hover"
                      >
                        {u.campaignName}
                      </Link>
                    </td>
                    <td className="text-right tabular-nums">{u.hours.toFixed(1)}</td>
                  </tr>
                ))}
                {!unbilled.length ? (
                  <tr>
                    <td colSpan={2} className="text-center opacity-60">
                      All approved billable work is invoiced.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <Link href="/app/billing" className="btn btn-primary btn-sm mt-4">
            Go to Billing
          </Link>
        </div>
      </CollapsibleSection>
    </div>
  );
}
