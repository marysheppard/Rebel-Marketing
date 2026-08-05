"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { EmptyState } from "@/components/ui";
import { num } from "@/lib/format";
import type { Task, TaskPriority, TaskStatus } from "@/lib/types";

type SortKey = "due_date" | "priority" | "title";

const PRIORITY_RANK: Record<string, number> = {
  Urgent: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

export function TaskTable({
  tasks,
  todayStr,
  canEdit = true,
}: {
  tasks: Task[];
  todayStr: string;
  canEdit?: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [selected, setSelected] = useState<Task | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = tasks.filter((t) => {
      if (statusFilter === "active" && t.status === "Completed") return false;
      if (statusFilter !== "all" && statusFilter !== "active" && t.status !== statusFilter)
        return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (!q) return true;
      const hay = [
        t.title,
        t.description,
        t.notes,
        t.campaigns?.campaign_name,
        t.campaigns?.clients?.client_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    rows = [...rows].sort((a, b) => {
      if (sortKey === "priority") {
        return (
          (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)
        );
      }
      if (sortKey === "title") return a.title.localeCompare(b.title);
      const ad = a.due_date ?? "9999-99-99";
      const bd = b.due_date ?? "9999-99-99";
      return ad.localeCompare(bd);
    });
    return rows;
  }, [tasks, statusFilter, priorityFilter, search, sortKey]);

  if (!tasks.length) {
    return (
      <EmptyState
        title="No tasks assigned"
        description="When work is assigned to you, it will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <label className="flex-1">
          <span className="text-xs font-medium opacity-70">Search</span>
          <input
            className="input input-bordered mt-1 w-full"
            placeholder="Title, client, notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          <span className="text-xs font-medium opacity-70">Status</span>
          <select
            className="select select-bordered mt-1 w-full min-w-[10rem]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="all">All</option>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </label>
        <label>
          <span className="text-xs font-medium opacity-70">Priority</span>
          <select
            className="select select-bordered mt-1 w-full min-w-[9rem]"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All</option>
            {(["Low", "Medium", "High", "Urgent"] as TaskPriority[]).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-xs font-medium opacity-70">Sort</span>
          <select
            className="select select-bordered mt-1 w-full min-w-[9rem]"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="due_date">Due date</option>
            <option value="priority">Priority</option>
            <option value="title">Title</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
        <table className="table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Client / Campaign</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Due</th>
              <th>Est / Act</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const overdue = Boolean(
                t.due_date &&
                  t.due_date < todayStr &&
                  t.status !== ("Completed" as TaskStatus),
              );
              return (
                <tr key={t.id} className={overdue ? "bg-error/5" : undefined}>
                  <td>
                    <div className="font-medium">{t.title}</div>
                    {t.description ? (
                      <div className="max-w-xs truncate text-xs opacity-60">
                        {t.description}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <div className="text-sm">
                      {t.campaigns?.clients?.client_name ?? "—"}
                    </div>
                    <Link
                      href={`/app/campaigns/${t.campaign_id}`}
                      className="link link-hover text-xs opacity-70"
                    >
                      {t.campaigns?.campaign_name ?? "Campaign"}
                    </Link>
                  </td>
                  <td>
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td>
                    <TaskStatusBadge status={t.status} />
                  </td>
                  <td className="whitespace-nowrap text-sm">
                    {t.due_date ?? "—"}
                    {overdue ? (
                      <span className="badge badge-error badge-xs ml-2">
                        Overdue
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap text-sm">
                    {num(t.estimated_hours).toFixed(1)} /{" "}
                    {num(t.actual_hours).toFixed(1)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setSelected(t)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
            {!filtered.length ? (
              <tr>
                <td colSpan={7} className="opacity-60">
                  No tasks match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selected ? (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <TaskDetailPanel
              task={selected}
              canEdit={canEdit}
              onClose={() => setSelected(null)}
            />
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="button" onClick={() => setSelected(null)}>
              close
            </button>
          </form>
        </dialog>
      ) : null}
    </div>
  );
}
