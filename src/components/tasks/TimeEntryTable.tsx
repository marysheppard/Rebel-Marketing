"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TimeEntryForm } from "@/components/tasks/TimeEntryForm";
import { EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { num } from "@/lib/format";
import type { Task, TimeEntry } from "@/lib/types";

type TaskOption = Pick<
  Task,
  "id" | "title" | "campaign_id" | "status" | "campaigns"
>;

export function TimeEntryTable({
  entries,
  tasks,
  campaigns = [],
  employeeId,
}: {
  entries: TimeEntry[];
  tasks: TaskOption[];
  campaigns?: { id: string; label: string; clientName?: string }[];
  employeeId: string;
}) {
  const router = useRouter();
  const [taskFilter, setTaskFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (taskFilter !== "all" && e.task_id !== taskFilter) return false;
      if (fromDate && e.work_date < fromDate) return false;
      if (toDate && e.work_date > toDate) return false;
      return true;
    });
  }, [entries, taskFilter, fromDate, toDate]);

  const periodTotal = filtered.reduce((s, e) => s + num(e.total_hours), 0);

  async function remove(id: string) {
    if (!confirm("Delete this time entry?")) return;
    setError(null);
    setLoadingId(id);
    const supabase = createClient();
    const { error: delError } = await supabase
      .from("time_entries")
      .delete()
      .eq("id", id);
    setLoadingId(null);
    if (delError) {
      setError(delError.message || "Could not delete entry.");
      return;
    }
    router.refresh();
  }

  if (!entries.length) {
    return (
      <EmptyState
        title="No time entries yet"
        description="Log time with start, end, and break to see your history here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <label>
          <span className="text-xs font-medium opacity-70">From</span>
          <input
            type="date"
            className="input input-bordered mt-1 w-full"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </label>
        <label>
          <span className="text-xs font-medium opacity-70">To</span>
          <input
            type="date"
            className="input input-bordered mt-1 w-full"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </label>
        <label className="flex-1">
          <span className="text-xs font-medium opacity-70">Task</span>
          <select
            className="select select-bordered mt-1 w-full"
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value)}
          >
            <option value="all">All tasks</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-box border border-base-300 bg-base-100 px-4 py-2">
          <div className="text-xs uppercase tracking-wide opacity-60">
            Period total
          </div>
          <div className="text-xl font-bold">{periodTotal.toFixed(1)}h</div>
        </div>
      </div>

      {error ? <div className="alert alert-error py-2 text-sm">{error}</div> : null}

      <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Task</th>
              <th>Start–End</th>
              <th>Break</th>
              <th className="text-right">Hours</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap">{e.work_date}</td>
                <td>
                  <div className="font-medium">{e.tasks?.title ?? "—"}</div>
                  <div className="text-xs opacity-60">
                    {e.tasks?.campaigns?.clients?.client_name ?? ""}
                    {e.tasks?.campaigns?.campaign_name
                      ? ` · ${e.tasks.campaigns.campaign_name}`
                      : ""}
                  </div>
                  {e.description ? (
                    <div className="max-w-xs truncate text-xs opacity-50">
                      {e.description}
                    </div>
                  ) : null}
                </td>
                <td className="whitespace-nowrap text-sm">
                  {String(e.start_time).slice(0, 5)}–
                  {String(e.end_time).slice(0, 5)}
                </td>
                <td>{e.break_minutes}m</td>
                <td className="text-right font-medium">
                  {num(e.total_hours).toFixed(2)}
                </td>
                <td className="whitespace-nowrap">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setEditing(e)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-error"
                    disabled={loadingId === e.id}
                    onClick={() => remove(e.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={6} className="opacity-60">
                  No entries in this range.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-xl">
            <h3 className="mb-4 text-lg font-bold">Edit time entry</h3>
            <TimeEntryForm
              employeeId={employeeId}
              tasks={tasks}
              campaigns={campaigns}
              initial={{
                id: editing.id,
                task_id: editing.task_id,
                work_date: editing.work_date,
                start_time: String(editing.start_time),
                end_time: String(editing.end_time),
                break_minutes: editing.break_minutes,
                description: editing.description,
              }}
              onDone={() => setEditing(null)}
            />
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="button" onClick={() => setEditing(null)}>
              close
            </button>
          </form>
        </dialog>
      ) : null}
    </div>
  );
}
