"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TaskPriorityBarChart, TaskStatusPieChart } from "@/components/Charts";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui";

export type TaskBoardItem = {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  status: string;
  priority: string;
  campaign_name: string;
  client_name: string;
  overdue: boolean;
};

function isClosed(status: string) {
  return status === "Submitted" || status === "Approved";
}

function TaskCard({ item }: { item: TaskBoardItem }) {
  return (
    <article className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/app/tasks/${item.id}`}
            className="link link-hover text-base font-semibold"
          >
            {item.title}
          </Link>
          {item.description ? (
            <p className="mt-1 line-clamp-2 text-sm opacity-60">
              {item.description}
            </p>
          ) : null}
          <p className="mt-2 text-xs opacity-60">
            {item.campaign_name} · {item.client_name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={item.priority} />
          <StatusBadge status={item.status} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className={item.overdue ? "font-medium text-error" : "opacity-70"}>
          {item.due_date ? `Due ${item.due_date}` : "No due date"}
        </span>
        {item.overdue ? (
          <span className="badge badge-error badge-sm">Overdue</span>
        ) : null}
      </div>
    </article>
  );
}

export function TasksBoard({
  items,
  todayStr,
  statusPie,
  priorityBars,
  openCount,
  overdueCount,
  dueThisWeekCount,
  submittedCount,
}: {
  items: TaskBoardItem[];
  todayStr: string;
  statusPie: { name: string; value: number }[];
  priorityBars: { priority: string; count: number }[];
  openCount: number;
  overdueCount: number;
  dueThisWeekCount: number;
  submittedCount: number;
}) {
  const [tab, setTab] = useState<"attention" | "progress" | "all">("attention");

  const weekEnd = useMemo(() => {
    const d = new Date(`${todayStr}T12:00:00`);
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }, [todayStr]);

  const needsAttention = items.filter(
    (t) =>
      !isClosed(t.status) &&
      t.due_date != null &&
      (t.overdue || (t.due_date >= todayStr && t.due_date <= weekEnd)),
  );

  const inProgress = items.filter(
    (t) =>
      t.status === "In Progress" ||
      t.status === "Not Started" ||
      t.status === "Needs Revision",
  );

  const allSorted = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      const ad = a.due_date ?? "9999-99-99";
      const bd = b.due_date ?? "9999-99-99";
      return ad.localeCompare(bd);
    });
  }, [items]);

  return (
    <div>
      <PageHeader
        title="My Tasks"
        subtitle="Work assigned to you under active contracts and campaigns"
      />

      {items.length === 0 ? (
        <EmptyState
          title="No tasks assigned"
          description="When account managers assign you deliverables, they will show up here by due date."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Open"
              value={String(openCount)}
              hint="Not submitted or approved"
              tone={openCount > 0 ? "warn" : "good"}
            />
            <StatCard
              label="Overdue"
              value={String(overdueCount)}
              hint="Past due date"
              tone={overdueCount > 0 ? "bad" : "neutral"}
            />
            <StatCard
              label="Due this week"
              value={String(dueThisWeekCount)}
              hint="Next 7 days"
              tone={dueThisWeekCount > 0 ? "warn" : "neutral"}
            />
            <StatCard
              label="Submitted"
              value={String(submittedCount)}
              hint="Awaiting approval"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <TaskStatusPieChart data={statusPie} />
            <TaskPriorityBarChart data={priorityBars} />
          </div>

          <div role="tablist" className="tabs tabs-boxed w-fit bg-base-200">
            <button
              type="button"
              role="tab"
              className={`tab ${tab === "attention" ? "tab-active" : ""}`}
              onClick={() => setTab("attention")}
            >
              Needs attention ({needsAttention.length})
            </button>
            <button
              type="button"
              role="tab"
              className={`tab ${tab === "progress" ? "tab-active" : ""}`}
              onClick={() => setTab("progress")}
            >
              In progress ({inProgress.length})
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

          {tab === "attention" ? (
            needsAttention.length === 0 ? (
              <p className="rounded-box border border-base-300 bg-base-100 p-6 text-sm opacity-60">
                Nothing urgent. No overdue or near-due tasks.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {needsAttention.map((t) => (
                  <TaskCard key={t.id} item={t} />
                ))}
              </div>
            )
          ) : null}

          {tab === "progress" ? (
            inProgress.length === 0 ? (
              <p className="rounded-box border border-base-300 bg-base-100 p-6 text-sm opacity-60">
                No open tasks in progress right now.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {inProgress.map((t) => (
                  <TaskCard key={t.id} item={t} />
                ))}
              </div>
            )
          ) : null}

          {tab === "all" ? (
            <div className="overflow-x-auto rounded-box border border-base-300">
              <table className="table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Campaign / Client</th>
                    <th>Due</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allSorted.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <Link
                          href={`/app/tasks/${t.id}`}
                          className="link link-hover font-medium"
                        >
                          {t.title}
                        </Link>
                        {t.description ? (
                          <div className="mt-0.5 max-w-xs truncate text-sm opacity-60">
                            {t.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="text-sm">
                        <div>{t.campaign_name}</div>
                        <div className="opacity-60">{t.client_name}</div>
                      </td>
                      <td
                        className={
                          t.overdue
                            ? "font-medium text-error"
                            : "whitespace-nowrap"
                        }
                      >
                        {t.due_date ?? "—"}
                      </td>
                      <td>
                        <StatusBadge status={t.priority} />
                      </td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
