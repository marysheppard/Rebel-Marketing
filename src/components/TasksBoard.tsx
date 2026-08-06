"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ListExportButton } from "@/components/exports/ListExportButton";
import { TaskPriorityBarChart, TaskStatusPieChart } from "@/components/Charts";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import type { TaskPriority } from "@/lib/types";

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

const PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Urgent"];

function isClosed(status: string) {
  return status === "Submitted" || status === "Approved";
}

function PriorityMultiSelect({
  selected,
  onChange,
}: {
  selected: TaskPriority[];
  onChange: (next: TaskPriority[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const allSelected = selected.length === 0 || selected.length === PRIORITIES.length;
  const summary = allSelected
    ? "All priorities"
    : selected.length === 1
      ? selected[0]
      : `${selected.length} priorities`;

  function toggle(p: TaskPriority) {
    // Empty selection means "all priorities"
    if (selected.length === 0) {
      onChange(PRIORITIES.filter((x) => x !== p));
      return;
    }
    const set = new Set(selected);
    if (set.has(p)) set.delete(p);
    else set.add(p);
    const next = PRIORITIES.filter((x) => set.has(x));
    onChange(next.length === 0 || next.length === PRIORITIES.length ? [] : next);
  }

  return (
    <div className="relative w-full max-w-[14rem]" ref={rootRef}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide opacity-60">
        Priority
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-sm h-auto min-h-10 w-full justify-between gap-2 border border-base-300 px-3 py-2 font-normal"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Filter open tasks by priority: ${summary}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 truncate text-left text-sm">{summary}</span>
        <span className="shrink-0 text-[10px] opacity-50" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <div
          className="absolute left-0 top-[calc(100%+0.35rem)] z-50 w-full rounded-box border border-base-300 bg-base-100 p-3 shadow-xl"
          role="listbox"
          aria-multiselectable
          aria-label="Priority"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => onChange([])}
            >
              All priorities
            </button>
          </div>
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {PRIORITIES.map((p) => {
              const checked = allSelected || selected.includes(p);
              return (
                <li key={p}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-base-200">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={checked}
                      onChange={() => toggle(p)}
                    />
                    <span>{p}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
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
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority[]>([]);

  const weekEnd = useMemo(() => {
    const d = new Date(`${todayStr}T12:00:00`);
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }, [todayStr]);

  const matchesOpenPriority = (t: TaskBoardItem) => {
    if (isClosed(t.status)) return false;
    if (
      priorityFilter.length > 0 &&
      !priorityFilter.includes(t.priority as TaskPriority)
    ) {
      return false;
    }
    return true;
  };

  const needsAttention = items.filter(
    (t) =>
      matchesOpenPriority(t) &&
      t.due_date != null &&
      (t.overdue || (t.due_date >= todayStr && t.due_date <= weekEnd)),
  );

  const inProgress = items.filter(
    (t) =>
      matchesOpenPriority(t) &&
      (t.status === "In Progress" ||
        t.status === "Not Started" ||
        t.status === "Needs Revision"),
  );

  const allSorted = useMemo(() => {
    return items
      .filter((t) => {
        if (isClosed(t.status)) return false;
        if (
          priorityFilter.length > 0 &&
          !priorityFilter.includes(t.priority as TaskPriority)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
        const ad = a.due_date ?? "9999-99-99";
        const bd = b.due_date ?? "9999-99-99";
        return ad.localeCompare(bd);
      });
  }, [items, priorityFilter]);

  const list =
    tab === "attention"
      ? needsAttention
      : tab === "progress"
        ? inProgress
        : allSorted;

  const priorityEmptyHint =
    priorityFilter.length === 0
      ? null
      : priorityFilter.length === 1
        ? priorityFilter[0]
        : priorityFilter.join(", ");

  return (
    <div>
      <PageHeader
        title="My Tasks"
        subtitle="Work assigned to you under active contracts and campaigns"
        actions={
          <ListExportButton
            title="Export tasks"
            description="Filter by status and priority, then download CSV or PDF."
            filenameBase="my-tasks"
            matchLabel="tasks"
            headers={[
              "Title",
              "Client",
              "Campaign",
              "Status",
              "Priority",
              "Due Date",
              "Overdue",
              "Description",
            ]}
            items={items.map((r) => ({
              _status: r.status,
              _type: r.priority,
              _date: r.due_date ?? "",
              Title: r.title,
              Client: r.client_name,
              Campaign: r.campaign_name,
              Status: r.status,
              Priority: r.priority,
              "Due Date": r.due_date ?? "—",
              Overdue: r.overdue ? "Yes" : "No",
              Description: r.description || "—",
            }))}
            filterConfig={{
              statusKey: "_status",
              statuses: [...new Set(items.map((i) => i.status))].sort(),
              typeKey: "_type",
              types: [...new Set(items.map((i) => i.priority))].sort(),
              typeLabel: "Priority",
              dateKey: "_date",
              showDates: true,
            }}
          />
        }
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

          <div className="flex flex-wrap items-end gap-3">
            <PriorityMultiSelect
              selected={priorityFilter}
              onChange={setPriorityFilter}
            />

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
                All ({allSorted.length})
              </button>
            </div>
          </div>

          {tab === "attention" ? (
            list.length === 0 ? (
              <p className="rounded-box border border-base-300 bg-base-100 p-6 text-sm opacity-60">
                {priorityEmptyHint
                  ? `No open tasks with priority ${priorityEmptyHint} need attention.`
                  : "Nothing urgent. No overdue or near-due tasks."}
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {list.map((t) => (
                  <TaskCard key={t.id} item={t} />
                ))}
              </div>
            )
          ) : null}

          {tab === "progress" ? (
            list.length === 0 ? (
              <p className="rounded-box border border-base-300 bg-base-100 p-6 text-sm opacity-60">
                {priorityEmptyHint
                  ? `No open tasks with priority ${priorityEmptyHint} in progress.`
                  : "No open tasks in progress right now."}
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {list.map((t) => (
                  <TaskCard key={t.id} item={t} />
                ))}
              </div>
            )
          ) : null}

          {tab === "all" ? (
            list.length === 0 ? (
              <p className="rounded-box border border-base-300 bg-base-100 p-6 text-sm opacity-60">
                {priorityEmptyHint
                  ? `No open tasks with priority ${priorityEmptyHint}.`
                  : "No open tasks."}
              </p>
            ) : (
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
                    {list.map((t) => (
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
            )
          ) : null}
        </div>
      )}
    </div>
  );
}
