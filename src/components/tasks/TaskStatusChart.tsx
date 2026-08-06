"use client";

import { useMemo } from "react";
import {
  DonutBreakdownViz,
  buildCountDonutSlices,
  type DonutBreakdownSlice,
} from "@/components/DonutBreakdownViz";

const COLORS: Record<string, string> = {
  "Not Started": "#94a3b8",
  "In Progress": "#38bdf8",
  Completed: "#4ade80",
  Overdue: "#f87171",
  Pending: "#fbbf24",
  Approved: "#4ade80",
  Rejected: "#f87171",
  "Changes Requested": "#fb923c",
  Active: "#38bdf8",
  Late: "#f87171",
  "On Hold": "#fbbf24",
  Submitted: "#a78bfa",
  "Needs Revision": "#f59e0b",
};

export function TaskStatusChart({
  data,
  slices: slicesProp,
  title = "Task mix",
  selectedKey,
  onSelectKey,
  onClearSelection,
}: {
  data?: { name: string; value: number }[];
  slices?: DonutBreakdownSlice[];
  title?: string;
  selectedKey?: string | null;
  onSelectKey?: (key: string) => void;
  onClearSelection?: () => void;
}) {
  const slices = useMemo(() => {
    if (slicesProp) return slicesProp;
    return buildCountDonutSlices(data ?? [], COLORS);
  }, [slicesProp, data]);

  return (
    <DonutBreakdownViz
      title={title}
      emptyMessage="No tasks to chart yet."
      slices={slices}
      valueFormat="count"
      centerTotalLabel="Total"
      valueColumnLabel="Count"
      categoryColumnLabel="Status"
      valueDetailLabel="Count"
      itemNoun="items"
      selectedKey={selectedKey}
      onSelectKey={onSelectKey}
      onClearSelection={onClearSelection}
    />
  );
}
