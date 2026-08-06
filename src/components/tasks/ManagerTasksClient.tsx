"use client";

import { useMemo, useState } from "react";
import { TaskStatusChart } from "@/components/tasks/TaskStatusChart";
import { TaskTable } from "@/components/tasks/TaskTable";
import type { DonutBreakdownSlice } from "@/components/DonutBreakdownViz";
import type { Task } from "@/lib/types";

function mostCommon(labels: string[]): string | null {
  const counts = new Map<string, number>();
  for (const label of labels) {
    if (!label || label === "—") continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [label, count] of counts) {
    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  }
  return best;
}

function taskMeta(t: Task): { campaign: string; client: string; assignee: string } {
  const camps = t.campaigns as
    | {
        campaign_name?: string;
        clients?: { client_name?: string } | { client_name?: string }[] | null;
      }
    | {
        campaign_name?: string;
        clients?: { client_name?: string } | { client_name?: string }[] | null;
      }[]
    | null;
  const camp = Array.isArray(camps) ? camps[0] : camps;
  const clientsRel = camp?.clients;
  const clientObj = Array.isArray(clientsRel) ? clientsRel[0] : clientsRel;
  const assignee = t.profiles as
    | { full_name?: string }
    | { full_name?: string }[]
    | null;
  const assigneeObj = Array.isArray(assignee) ? assignee[0] : assignee;
  return {
    campaign: camp?.campaign_name ?? "—",
    client: clientObj?.client_name ?? "—",
    assignee: assigneeObj?.full_name ?? "—",
  };
}

export function buildManagerTaskMixSlices(
  tasks: Task[],
  todayStr: string,
): DonutBreakdownSlice[] {
  const openTasks = tasks.filter((t) => t.status !== "Completed");
  const overdueIds = new Set(
    openTasks
      .filter((t) => t.due_date && t.due_date < todayStr)
      .map((t) => t.id),
  );

  const buckets: {
    key: string;
    color: string;
    match: (t: Task) => boolean;
  }[] = [
    {
      key: "Not Started",
      color: "#94a3b8",
      match: (t) => t.status === "Not Started" && !overdueIds.has(t.id),
    },
    {
      key: "In Progress",
      color: "#38bdf8",
      match: (t) => t.status === "In Progress" && !overdueIds.has(t.id),
    },
    {
      key: "Completed",
      color: "#4ade80",
      match: (t) => t.status === "Completed",
    },
    {
      key: "Overdue",
      color: "#f87171",
      match: (t) => overdueIds.has(t.id),
    },
  ];

  const total = tasks.length;
  return buckets
    .map((b) => {
      const rows = tasks.filter(b.match);
      if (rows.length === 0) return null;
      const metas = rows.map(taskMeta);
      const highPriority = rows.filter(
        (t) => t.priority === "Urgent" || t.priority === "High",
      ).length;
      return {
        key: b.key,
        name: b.key,
        value: rows.length,
        count: rows.length,
        share: total > 0 ? (rows.length / total) * 100 : null,
        color: b.color,
        insights: [
          { label: "Urgent / High", value: String(highPriority) },
          {
            label: "Top Campaign",
            value: mostCommon(metas.map((m) => m.campaign)) ?? "Not available",
          },
          {
            label: "Top Client",
            value: mostCommon(metas.map((m) => m.client)) ?? "Not available",
          },
          {
            label: "Top Assignee",
            value: mostCommon(metas.map((m) => m.assignee)) ?? "Not available",
          },
        ],
      } satisfies DonutBreakdownSlice;
    })
    .filter((s): s is NonNullable<typeof s> => s != null);
}

export function ManagerTasksClient({
  tasks,
  todayStr,
  canEdit,
}: {
  tasks: Task[];
  todayStr: string;
  canEdit: boolean;
}) {
  const [mixFilter, setMixFilter] = useState<string | null>(null);
  const slices = useMemo(
    () => buildManagerTaskMixSlices(tasks, todayStr),
    [tasks, todayStr],
  );

  const filteredTasks = useMemo(() => {
    if (!mixFilter) return tasks;
    const overdueIds = new Set(
      tasks
        .filter(
          (t) =>
            t.status !== "Completed" && t.due_date && t.due_date < todayStr,
        )
        .map((t) => t.id),
    );
    if (mixFilter === "Overdue") {
      return tasks.filter((t) => overdueIds.has(t.id));
    }
    if (mixFilter === "Completed") {
      return tasks.filter((t) => t.status === "Completed");
    }
    return tasks.filter(
      (t) => t.status === mixFilter && !overdueIds.has(t.id),
    );
  }, [tasks, mixFilter, todayStr]);

  return (
    <>
      <div className="mb-8">
        <TaskStatusChart
          slices={slices}
          title="Task mix"
          selectedKey={mixFilter}
          onSelectKey={setMixFilter}
          onClearSelection={() => setMixFilter(null)}
        />
      </div>
      <TaskTable tasks={filteredTasks} todayStr={todayStr} canEdit={canEdit} />
    </>
  );
}
