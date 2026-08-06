"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CreateWorkForm, PtoRequestForm } from "@/components/forms";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { TimePtoExportButton } from "@/components/work/TimePtoExportButton";
import { num } from "@/lib/format";

export type TimeEntryItem = {
  id: string;
  work_date: string;
  campaign_id: string;
  campaign_name: string;
  task_id: string | null;
  task_title: string | null;
  work_type: string;
  description: string;
  hours: number;
  billable: boolean;
  retainer_bucket: string | null;
  out_of_scope: boolean;
  approval_status: string;
  logged_by: string;
};

export type PtoItem = {
  id: string;
  start_date: string;
  end_date: string;
  hours: number;
  status: string;
  reason: string;
};

function formatHours(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function FlagBadges({
  billable,
  retainer_bucket,
  out_of_scope,
}: {
  billable: boolean;
  retainer_bucket: string | null;
  out_of_scope: boolean;
}) {
  const badges: { key: string; label: string; className: string }[] = [];
  if (billable) {
    badges.push({
      key: "billable",
      label: "Billable",
      className: "badge-success",
    });
  }
  if (retainer_bucket && retainer_bucket !== "Not Applicable") {
    badges.push({
      key: "retainer",
      label: retainer_bucket,
      className: "badge-info",
    });
  }
  if (out_of_scope) {
    badges.push({
      key: "oos",
      label: "Out of scope",
      className: "badge-warning",
    });
  }
  if (badges.length === 0) {
    return <span className="text-xs opacity-40">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((b) => (
        <span key={b.key} className={`badge badge-sm ${b.className}`}>
          {b.label}
        </span>
      ))}
    </div>
  );
}

export function TimePtoBoard({
  isEmployee,
  userId,
  entries,
  pto,
  campaigns,
  tasks,
  weekStart,
  monthStart,
  weekHours,
  monthHours,
  weekTarget,
  monthTarget,
  pendingApprovalHours,
  pendingPto,
}: {
  isEmployee: boolean;
  userId: string;
  entries: TimeEntryItem[];
  pto: PtoItem[];
  campaigns: { id: string; label: string }[];
  tasks: { id: string; label: string; campaign_id: string }[];
  weekStart: string;
  monthStart: string;
  weekHours: number;
  monthHours: number;
  weekTarget: number | null;
  monthTarget: number | null;
  pendingApprovalHours: number;
  pendingPto: number;
}) {
  const [range, setRange] = useState<"week" | "month" | "all">("week");
  const [showLog, setShowLog] = useState(false);
  const [showPto, setShowPto] = useState(false);

  const filteredEntries = useMemo(() => {
    if (range === "week") {
      return entries.filter((e) => e.work_date >= weekStart);
    }
    if (range === "month") {
      return entries.filter((e) => e.work_date >= monthStart);
    }
    return entries;
  }, [entries, range, weekStart, monthStart]);

  const ptoSorted = useMemo(() => {
    return [...pto].sort((a, b) => {
      const ap = a.status === "Pending" ? 0 : 1;
      const bp = b.status === "Pending" ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return b.start_date.localeCompare(a.start_date);
    });
  }, [pto]);

  return (
    <div>
      <PageHeader
        title="Time & PTO"
        subtitle="Log hours against campaigns and request time off"
        actions={
          <div className="flex flex-wrap gap-2">
            <TimePtoExportButton entries={entries} pto={pto} />
            {isEmployee ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setShowLog((v) => !v);
                    setShowPto(false);
                  }}
                >
                  {showLog ? "Cancel" : "Log time"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setShowPto((v) => !v);
                    setShowLog(false);
                  }}
                >
                  {showPto ? "Cancel" : "Request PTO"}
                </button>
              </>
            ) : null}
          </div>
        }
      />

      {isEmployee && showLog ? (
        <section className="mb-6 rounded-box border border-base-300 bg-base-100 p-6">
          <h2 className="mb-4 text-xl font-bold">Log time</h2>
          <CreateWorkForm
            campaigns={campaigns}
            userId={userId}
            tasks={tasks}
          />
        </section>
      ) : null}

      {isEmployee && showPto ? (
        <section className="mb-6 rounded-box border border-base-300 bg-base-100 p-6">
          <h2 className="mb-4 text-xl font-bold">Request PTO</h2>
          <PtoRequestForm userId={userId} />
        </section>
      ) : null}

      {isEmployee ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Hours this week"
            value={
              weekTarget != null
                ? `${formatHours(weekHours)} / ${formatHours(weekTarget)}`
                : formatHours(weekHours)
            }
          />
          <StatCard
            label="Hours this month"
            value={
              monthTarget != null
                ? `${formatHours(monthHours)} / ${formatHours(monthTarget)}`
                : formatHours(monthHours)
            }
          />
          <StatCard
            label="Pending approval"
            value={`${formatHours(pendingApprovalHours)}h`}
            hint="Hours awaiting review"
            tone={pendingApprovalHours > 0 ? "warn" : "neutral"}
          />
          <StatCard
            label="Pending PTO"
            value={String(pendingPto)}
            hint="Open time-off requests"
            tone={pendingPto > 0 ? "warn" : "neutral"}
          />
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-[#0b1f3a]">Time entries</h2>
          <div role="tablist" className="tabs tabs-boxed bg-base-200">
            <button
              type="button"
              role="tab"
              className={`tab ${range === "week" ? "tab-active" : ""}`}
              onClick={() => setRange("week")}
            >
              This week
            </button>
            <button
              type="button"
              role="tab"
              className={`tab ${range === "month" ? "tab-active" : ""}`}
              onClick={() => setRange("month")}
            >
              This month
            </button>
            <button
              type="button"
              role="tab"
              className={`tab ${range === "all" ? "tab-active" : ""}`}
              onClick={() => setRange("all")}
            >
              All
            </button>
          </div>
        </div>

        {entries.length === 0 ? (
          <EmptyState
            title="No work entries"
            description="Log strategy, creative, production, and account hours against active campaigns."
          />
        ) : filteredEntries.length === 0 ? (
          <p className="rounded-box border border-base-300 bg-base-100 p-6 text-sm opacity-60">
            No entries in this range.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-box border border-base-300">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Campaign</th>
                  <th>Task</th>
                  <th>Type</th>
                  <th className="text-right">Hours</th>
                  <th>Flags</th>
                  <th>Approval</th>
                  <th>Logged by</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((w) => (
                  <tr key={w.id}>
                    <td className="whitespace-nowrap">{w.work_date}</td>
                    <td>
                      <Link
                        href={`/app/campaigns/${w.campaign_id}`}
                        className="link link-hover"
                        title={w.description || undefined}
                      >
                        {w.campaign_name}
                      </Link>
                    </td>
                    <td>
                      {w.task_id ? (
                        <Link
                          href={`/app/tasks/${w.task_id}`}
                          className="link link-hover"
                        >
                          {w.task_title ?? "Task"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td title={w.description || undefined}>{w.work_type}</td>
                    <td className="text-right">{w.hours}</td>
                    <td>
                      <FlagBadges
                        billable={w.billable}
                        retainer_bucket={w.retainer_bucket}
                        out_of_scope={w.out_of_scope}
                      />
                    </td>
                    <td>
                      <StatusBadge status={w.approval_status} />
                    </td>
                    <td>{w.logged_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isEmployee ? (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-[#0b1f3a]">PTO</h2>
          <div className="rounded-box border border-base-300 bg-base-100 p-5">
            <h3 className="mb-4 text-lg font-bold">Your PTO requests</h3>
            {ptoSorted.length === 0 ? (
              <p className="text-sm opacity-60">
                No PTO requests submitted yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Dates</th>
                      <th>Hours</th>
                      <th>Status</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ptoSorted.map((r) => (
                      <tr key={r.id}>
                        <td className="whitespace-nowrap">
                          {r.start_date} → {r.end_date}
                        </td>
                        <td>{num(r.hours)}</td>
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="max-w-[12rem] truncate text-sm">
                          {r.reason || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
