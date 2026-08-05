"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ChartCard } from "@/components/Charts";

export function NamedBarChart({
  title,
  data,
  valueKey = "value",
  color = "#38bdf8",
}: {
  title: string;
  data: { name: string; value: number }[];
  valueKey?: string;
  color?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const hasData = data.some((d) => d.value > 0);
  const chartData = data.map((d) => ({ name: d.name, [valueKey]: d.value }));

  return (
    <ChartCard title={title} empty={!hasData}>
      {mounted && hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis type="number" allowDecimals />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey={valueKey} fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full" aria-hidden />
      )}
    </ChartCard>
  );
}
