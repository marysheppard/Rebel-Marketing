"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskStatus } from "@/lib/types";

export function TaskActions({ task }: { task: Task }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function setStatus(status: TaskStatus) {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        status,
        completed_at:
          status === "Completed" ? new Date().toISOString() : null,
      })
      .eq("id", task.id);
    setLoading(false);
    if (updateError) {
      setError(updateError.message || "Could not update task.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {task.status === "Not Started" ? (
          <button
            type="button"
            className="btn btn-sm btn-outline"
            disabled={loading}
            onClick={() => setStatus("In Progress")}
          >
            Start
          </button>
        ) : null}
        {task.status !== "Completed" ? (
          <button
            type="button"
            className="btn btn-sm btn-success"
            disabled={loading}
            onClick={() => setStatus("Completed")}
          >
            Mark Complete
          </button>
        ) : null}
      </div>
      {error ? (
        <div className="alert alert-error py-2 text-xs">{error}</div>
      ) : null}
    </div>
  );
}
