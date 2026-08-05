"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { ChartCard } from "@/components/Charts";

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
};

export function TaskStatusChart({
  data,
  title = "Task mix",
}: {
  data: { name: string; value: number }[];
  title?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const filtered = data.filter((d) => d.value > 0);
  const hasData = filtered.length > 0;

  return (
    <ChartCard title={title} empty={!hasData}>
      {mounted && hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filtered}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={2}
            >
              {filtered.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={COLORS[entry.name] ?? "#64748b"}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full" aria-hidden />
      )}
    </ChartCard>
  );
}
