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

export function WeeklyHoursChart({
  data,
  title = "Hours this week",
}: {
  data: { day: string; hours: number }[];
  title?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const hasData = data.some((d) => d.hours > 0);
  return (
    <ChartCard title={title} empty={!hasData}>
      {mounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="day" />
            <YAxis allowDecimals />
            <Tooltip />
            <Bar
              dataKey="hours"
              fill="#38bdf8"
              name="Hours"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full" aria-hidden />
      )}
    </ChartCard>
  );
}
