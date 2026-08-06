"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ApprovalAgingBarChart,
  ApprovalClientWorkloadChart,
  ApprovalStatusDetailChart,
  ApprovalStatusPieChart,
  buildApprovalDonutSlices,
} from "@/components/Charts";
import { UpdateApprovalStatusForm } from "@/components/forms";
import { EmptyState, StatCard, StatusBadge } from "@/components/ui";
import {
  buildApprovalKpis,
  buildPendingWaitRows,
  buildStatusComposition,
  filterApprovalItems,
  uniqueClients,
  uniqueTypes,
  type ApprovalChartFilters,
} from "@/lib/approvals-metrics";

export type ApprovalBoardItem = {
  id: string;
  client_id: string;
  campaign_id: string;
  approval_type: string;
  description: string;
  requested_date: string;
  approval_status: string;
  client_name: string;
  campaign_name: string;
  waitingDays: number | null;
};

export function ApprovalsBoard({
  items,
  isClient,
  variant = "simple",
  statusPie: _statusPieProp,
  agingBars: agingBarsProp,
  pendingCount: pendingCountProp,
  overdueCount: overdueCountProp,
  avgWaitDays: avgWaitDaysProp,
}: {
  items: ApprovalBoardItem[];
  isClient: boolean;
  variant?: "simple" | "advanced";
  /** @deprecated simple mode builds slices from items */
  statusPie: { name: string; value: number }[];
  agingBars: { bucket: string; count: number; fill?: string }[];
  pendingCount: number;
  overdueCount: number;
  avgWaitDays: number | null;
}) {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [filters, setFilters] = useState<ApprovalChartFilters>({
    clientId: "all",
    type: "all",
    status: "all",
  });

  const advanced = variant === "advanced";

  const slices = useMemo(() => buildApprovalDonutSlices(items), [items]);

  const filteredItems = useMemo(() => {
    if (advanced) return filterApprovalItems(items, filters);
    if (!statusFilter) return items;
    return items.filter((a) => a.approval_status === statusFilter);
  }, [advanced, items, filters, statusFilter]);

  /** Charts stay comparable when status is drilled (like costs category donut). */
  const chartScopeItems = useMemo(
    () =>
      advanced
        ? filterApprovalItems(items, { ...filters, status: "all" })
        : items,
    [advanced, items, filters],
  );

  const kpis = useMemo(() => {
    if (!advanced) {
      return {
        pendingCount: pendingCountProp,
        overdueCount: overdueCountProp,
        avgWaitDays: avgWaitDaysProp,
        approvedYtd: 0,
        changesRequested: 0,
        approvalRate: null as number | null,
      };
    }
    return buildApprovalKpis(filteredItems);
  }, [
    advanced,
    filteredItems,
    pendingCountProp,
    overdueCountProp,
    avgWaitDaysProp,
  ]);

  const statusComposition = useMemo(
    () => (advanced ? buildStatusComposition(chartScopeItems) : null),
    [advanced, chartScopeItems],
  );
  const pendingWait = useMemo(
    () => (advanced ? buildPendingWaitRows(chartScopeItems) : null),
    [advanced, chartScopeItems],
  );

  const clients = useMemo(() => uniqueClients(items), [items]);
  const types = useMemo(() => uniqueTypes(items), [items]);

  const pending = filteredItems.filter((a) => a.approval_status === "Pending");
  const pendingTabCount = pending.length;
  const allTabCount = filteredItems.length;

  if (items.length === 0) {
    return (
      <EmptyState
        title="No approval requests"
        description="Staff can request client approval on campaigns. Clients respond here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div
        className={`grid gap-4 sm:grid-cols-3 ${advanced ? "xl:grid-cols-6" : ""}`}
      >
        <StatCard
          label="Pending"
          value={String(kpis.pendingCount)}
          hint="Awaiting a decision"
          tone={kpis.pendingCount > 0 ? "warn" : "good"}
        />
        <StatCard
          label="Overdue"
          value={String(kpis.overdueCount)}
          hint="Pending 7+ days"
          tone={kpis.overdueCount > 0 ? "bad" : "neutral"}
        />
        <StatCard
          label="Avg wait"
          value={kpis.avgWaitDays == null ? "-" : `${kpis.avgWaitDays}d`}
          hint="Among pending requests"
          tone="neutral"
        />
        {advanced ? (
          <>
            <StatCard
              label="Approved (YTD)"
              value={String(kpis.approvedYtd)}
              hint="Requested this year, approved"
              tone="good"
            />
            <StatCard
              label="Approval rate"
              value={
                kpis.approvalRate == null ? "-" : `${kpis.approvalRate}%`
              }
              hint="Approved / decided"
            />
            <StatCard
              label="Changes requested"
              value={String(kpis.changesRequested)}
              tone={kpis.changesRequested > 0 ? "warn" : "neutral"}
            />
          </>
        ) : null}
      </div>

      {advanced ? (
        <div className="grid gap-2 rounded-box border border-base-300 bg-base-100 p-3 sm:grid-cols-3">
          <label className="form-control">
            <span className="label-text text-xs opacity-70">Client</span>
            <select
              className="select select-bordered select-sm"
              value={filters.clientId}
              onChange={(e) =>
                setFilters((f) => ({ ...f, clientId: e.target.value }))
              }
            >
              <option value="all">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control">
            <span className="label-text text-xs opacity-70">Type</span>
            <select
              className="select select-bordered select-sm"
              value={filters.type}
              onChange={(e) =>
                setFilters((f) => ({ ...f, type: e.target.value }))
              }
            >
              <option value="all">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control">
            <span className="label-text text-xs opacity-70">Status</span>
            <select
              className="select select-bordered select-sm"
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value }))
              }
            >
              <option value="all">All statuses</option>
              {(
                [
                  "Pending",
                  "Changes Requested",
                  "Approved",
                  "Rejected",
                ] as const
              ).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {advanced && statusComposition && pendingWait ? (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <ApprovalStatusDetailChart
            slices={statusComposition.slices}
            total={statusComposition.total}
            selectedStatus={filters.status}
            onSelectStatus={(status) =>
              setFilters((f) => ({ ...f, status }))
            }
            onClearStatus={() =>
              setFilters((f) => ({ ...f, status: "all" }))
            }
          />
          <ApprovalClientWorkloadChart
            rows={pendingWait.rows}
            pendingTotal={pendingWait.pendingTotal}
            overdueCount={pendingWait.overdueCount}
            selectedClientId={filters.clientId}
            onSelectClient={(clientId) =>
              setFilters((f) => ({ ...f, clientId }))
            }
            onClearClient={() =>
              setFilters((f) => ({ ...f, clientId: "all" }))
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          <ApprovalStatusPieChart
            slices={slices}
            selectedKey={statusFilter}
            onSelectKey={(key) => {
              setStatusFilter(key);
              setTab("all");
            }}
            onClearSelection={() => setStatusFilter(null)}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <ApprovalAgingBarChart data={agingBarsProp} />
          </div>
        </div>
      )}

      <div role="tablist" className="tabs tabs-boxed w-fit bg-base-200">
        <button
          type="button"
          role="tab"
          className={`tab ${tab === "pending" ? "tab-active" : ""}`}
          onClick={() => setTab("pending")}
        >
          Pending ({pendingTabCount})
        </button>
        <button
          type="button"
          role="tab"
          className={`tab ${tab === "all" ? "tab-active" : ""}`}
          onClick={() => setTab("all")}
        >
          All ({allTabCount})
        </button>
      </div>

      {tab === "pending" ? (
        pending.length === 0 ? (
          <p className="rounded-box border border-base-300 bg-base-100 p-6 text-sm opacity-60">
            {!advanced && statusFilter
              ? `No pending approvals with status “${statusFilter}”.`
              : "Nothing waiting. You are caught up on approvals."}
          </p>
        ) : (
          <div className="grid gap-4">
            {pending.map((a) => (
              <article
                key={a.id}
                className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={a.approval_status} />
                      <span className="text-sm font-medium">
                        {a.approval_type}
                      </span>
                      {a.waitingDays != null ? (
                        <span
                          className={`text-xs font-medium ${
                            a.waitingDays >= 7
                              ? "text-error"
                              : a.waitingDays >= 3
                                ? "text-warning"
                                : "opacity-60"
                          }`}
                        >
                          Waiting {a.waitingDays}d
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm">{a.description}</p>
                    <p className="mt-2 text-xs opacity-60">
                      <Link
                        href={`/app/clients/${a.client_id}`}
                        className="link link-hover"
                      >
                        {a.client_name}
                      </Link>
                      {" | "}
                      <Link
                        href={`/app/campaigns/${a.campaign_id}`}
                        className="link link-hover"
                      >
                        {a.campaign_name}
                      </Link>
                      {" | "}
                      Requested {a.requested_date}
                    </p>
                  </div>
                  {isClient ? (
                    <UpdateApprovalStatusForm
                      approvalId={a.id}
                      currentStatus={a.approval_status}
                    />
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )
      ) : (
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table">
            <thead>
              <tr>
                <th>Requested</th>
                <th>Client</th>
                <th>Campaign</th>
                <th>Type</th>
                <th>Description</th>
                <th>Days waiting</th>
                <th>Status</th>
                {isClient ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={isClient ? 8 : 7} className="opacity-60">
                    No approvals match this filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((a) => (
                  <tr key={a.id}>
                    <td>{a.requested_date}</td>
                    <td>
                      <Link
                        href={`/app/clients/${a.client_id}`}
                        className="link link-hover"
                      >
                        {a.client_name}
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/app/campaigns/${a.campaign_id}`}
                        className="link link-hover"
                      >
                        {a.campaign_name}
                      </Link>
                    </td>
                    <td>{a.approval_type}</td>
                    <td className="max-w-xs">{a.description}</td>
                    <td>
                      {a.waitingDays != null ? (
                        <span
                          className={
                            a.waitingDays >= 7
                              ? "font-medium text-error"
                              : a.waitingDays >= 3
                                ? "text-warning"
                                : ""
                          }
                        >
                          {a.waitingDays}d
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <StatusBadge status={a.approval_status} />
                    </td>
                    {isClient ? (
                      <td>
                        <UpdateApprovalStatusForm
                          approvalId={a.id}
                          currentStatus={a.approval_status}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
