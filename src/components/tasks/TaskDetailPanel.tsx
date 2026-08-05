"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { createClient } from "@/lib/supabase/client";
import { num } from "@/lib/format";
import type { Task, TaskStatus } from "@/lib/types";

export function TaskDetailPanel({
  task,
  onClose,
  canEdit = true,
}: {
  task: Task;
  onClose?: () => void;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(task.notes ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(updates: {
    status?: TaskStatus;
    notes?: string;
    complete?: boolean;
  }) {
    setError(null);
    setSaved(false);
    setLoading(true);
    const supabase = createClient();
    const nextStatus = updates.complete
      ? "Completed"
      : (updates.status ?? status);
    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        status: nextStatus,
        notes: updates.notes ?? notes,
        completed_at:
          nextStatus === "Completed" ? new Date().toISOString() : null,
      })
      .eq("id", task.id);
    setLoading(false);
    if (updateError) {
      setError(updateError.message || "Could not save task.");
      return;
    }
    setStatus(nextStatus);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">{task.title}</h3>
          <p className="mt-1 text-sm opacity-70">
            {task.campaigns?.clients?.client_name
              ? `${task.campaigns.clients.client_name} · `
              : ""}
            {task.campaigns?.campaign_name ?? "No campaign"}
          </p>
        </div>
        {onClose ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <PriorityBadge priority={task.priority} />
        <TaskStatusBadge status={status} />
      </div>

      {task.description ? (
        <p className="text-sm leading-relaxed opacity-80">{task.description}</p>
      ) : null}

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="opacity-60">Due</dt>
          <dd>{task.due_date ?? "—"}</dd>
        </div>
        <div>
          <dt className="opacity-60">Assigned</dt>
          <dd>{task.assigned_date ?? "—"}</dd>
        </div>
        <div>
          <dt className="opacity-60">Completed</dt>
          <dd>
            {task.completed_at
              ? new Date(task.completed_at).toLocaleDateString()
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="opacity-60">Est / Actual</dt>
          <dd>
            {num(task.estimated_hours).toFixed(1)}h /{" "}
            {num(task.actual_hours).toFixed(1)}h
          </dd>
        </div>
      </dl>

      {canEdit ? (
        <div className="space-y-3 border-t border-base-300 pt-4">
          <label className="block">
            <span className="text-sm font-medium">Status</span>
            <select
              className="select select-bordered mt-1 w-full"
              value={status}
              disabled={loading}
              onChange={(e) => {
                const next = e.target.value as TaskStatus;
                setStatus(next);
                void save({ status: next });
              }}
            >
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Notes</span>
            <textarea
              className="textarea textarea-bordered mt-1 w-full"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={loading}
              onClick={() => save({ notes })}
            >
              Save notes
            </button>
            {status !== "Completed" ? (
              <button
                type="button"
                className="btn btn-success btn-sm"
                disabled={loading}
                onClick={() => save({ complete: true })}
              >
                Mark Complete
              </button>
            ) : null}
          </div>
          {error ? <div className="alert alert-error py-2 text-xs">{error}</div> : null}
          {saved ? (
            <div className="alert alert-success py-2 text-xs">Saved.</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
