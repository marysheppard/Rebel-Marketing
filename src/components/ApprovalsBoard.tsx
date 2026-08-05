"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ApprovalAgingBarChart,
  ApprovalStatusPieChart,
} from "@/components/Charts";
import { UpdateApprovalStatusForm } from "@/components/forms";
import { EmptyState, StatCard, StatusBadge } from "@/components/ui";

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
  statusPie,
  agingBars,
  pendingCount,
  overdueCount,
  avgWaitDays,
}: {
  items: ApprovalBoardItem[];
  isClient: boolean;
  statusPie: { name: string; value: number }[];
  agingBars: { bucket: string; count: number }[];
  pendingCount: number;
  overdueCount: number;
  avgWaitDays: number | null;
}) {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const pending = items.filter((a) => a.approval_status === "Pending");

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
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending"
          value={String(pendingCount)}
          hint="Awaiting a decision"
          tone={pendingCount > 0 ? "warn" : "good"}
        />
        <StatCard
          label="Overdue"
          value={String(overdueCount)}
          hint="Pending 7+ days"
          tone={overdueCount > 0 ? "bad" : "neutral"}
        />
        <StatCard
          label="Avg wait"
          value={avgWaitDays == null ? "—" : `${avgWaitDays}d`}
          hint="Among pending requests"
          tone="neutral"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ApprovalStatusPieChart data={statusPie} />
        <ApprovalAgingBarChart data={agingBars} />
      </div>

      <div role="tablist" className="tabs tabs-boxed w-fit bg-base-200">
        <button
          type="button"
          role="tab"
          className={`tab ${tab === "pending" ? "tab-active" : ""}`}
          onClick={() => setTab("pending")}
        >
          Pending ({pendingCount})
        </button>
        <button
          type="button"
          role="tab"
          className={`tab ${tab === "all" ? "tab-active" : ""}`}
          onClick={() => setTab("all")}
        >
          All ({items.length})
        </button>
      </div>

      {tab === "pending" ? (
        pending.length === 0 ? (
          <p className="rounded-box border border-base-300 bg-base-100 p-6 text-sm opacity-60">
            Nothing waiting. You’re caught up on approvals.
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
                      <span className="text-sm font-medium">{a.approval_type}</span>
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
                      {" · "}
                      <Link
                        href={`/app/campaigns/${a.campaign_id}`}
                        className="link link-hover"
                      >
                        {a.campaign_name}
                      </Link>
                      {" · "}
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
              {items.map((a) => (
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
                      "—"
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
