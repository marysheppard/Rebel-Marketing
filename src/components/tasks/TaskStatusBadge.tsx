import type { TaskStatus } from "@/lib/types";

const MAP: Record<TaskStatus, string> = {
  "Not Started": "badge-ghost",
  "In Progress": "badge-info",
  Completed: "badge-success",
  Submitted: "badge-warning",
  Approved: "badge-success",
  "Needs Revision": "badge-error",
};

export function TaskStatusBadge({ status }: { status: TaskStatus | string }) {
  const cls = MAP[status as TaskStatus] ?? "badge-neutral";
  return <span className={`badge ${cls} badge-sm`}>{status}</span>;
}
