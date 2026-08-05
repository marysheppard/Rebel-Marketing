import type { TaskPriority } from "@/lib/types";

const MAP: Record<TaskPriority, string> = {
  Low: "badge-ghost",
  Medium: "badge-info",
  High: "badge-warning",
  Urgent: "badge-error",
};

export function PriorityBadge({ priority }: { priority: TaskPriority | string }) {
  const cls = MAP[priority as TaskPriority] ?? "badge-neutral";
  return <span className={`badge ${cls} badge-sm`}>{priority}</span>;
}
