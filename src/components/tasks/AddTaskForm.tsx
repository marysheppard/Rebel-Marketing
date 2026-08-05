"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toDateStr } from "@/lib/time";
import type { TaskPriority } from "@/lib/types";

type Option = { id: string; label: string };

export function AddTaskForm({
  campaigns,
  employees,
  createdBy,
}: {
  campaigns: Option[];
  employees: Option[];
  createdBy: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("tasks").insert({
      campaign_id: String(fd.get("campaign_id")),
      assignee_id: String(fd.get("assignee_id")),
      created_by: createdBy,
      title: String(fd.get("title") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim(),
      status: "Not Started",
      priority: String(fd.get("priority") || "Medium") as TaskPriority,
      due_date: String(fd.get("due_date") || "") || null,
      estimated_hours: Number(fd.get("estimated_hours") || 0),
      assigned_date: String(fd.get("assigned_date") || toDateStr(new Date())),
      notes: String(fd.get("notes") ?? "").trim(),
    });
    setLoading(false);
    if (insertError) {
      setError(insertError.message || "Could not create task.");
      return;
    }
    setSuccess("Task assigned.");
    (e.target as HTMLFormElement).reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Cancel" : "+ Add Task"}
      </button>
      {open ? (
        <form
          onSubmit={onSubmit}
          className="mt-4 grid gap-3 rounded-box border border-base-300 bg-base-100 p-4 sm:grid-cols-2"
        >
          {error ? (
            <div className="alert alert-error sm:col-span-2 py-2 text-sm">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="alert alert-success sm:col-span-2 py-2 text-sm">
              {success}
            </div>
          ) : null}
          <label className="sm:col-span-2">
            <span className="text-sm font-medium">Title *</span>
            <input
              name="title"
              className="input input-bordered mt-1 w-full"
              required
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-medium">Description</span>
            <textarea
              name="description"
              className="textarea textarea-bordered mt-1 w-full"
              rows={2}
            />
          </label>
          <label>
            <span className="text-sm font-medium">Campaign *</span>
            <select
              name="campaign_id"
              className="select select-bordered mt-1 w-full"
              required
              defaultValue=""
            >
              <option value="">Select campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-medium">Assignee *</span>
            <select
              name="assignee_id"
              className="select select-bordered mt-1 w-full"
              required
              defaultValue=""
            >
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-medium">Priority</span>
            <select
              name="priority"
              className="select select-bordered mt-1 w-full"
              defaultValue="Medium"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
          </label>
          <label>
            <span className="text-sm font-medium">Estimated hours</span>
            <input
              name="estimated_hours"
              type="number"
              min={0}
              step={0.25}
              className="input input-bordered mt-1 w-full"
              defaultValue={0}
            />
          </label>
          <label>
            <span className="text-sm font-medium">Due date</span>
            <input
              name="due_date"
              type="date"
              className="input input-bordered mt-1 w-full"
            />
          </label>
          <label>
            <span className="text-sm font-medium">Assigned date</span>
            <input
              name="assigned_date"
              type="date"
              className="input input-bordered mt-1 w-full"
              defaultValue={toDateStr(new Date())}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-medium">Notes</span>
            <textarea
              name="notes"
              className="textarea textarea-bordered mt-1 w-full"
              rows={2}
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving…" : "Create task"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
