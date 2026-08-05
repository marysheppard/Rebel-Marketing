"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from "recharts";
import { money } from "@/lib/format";

function formatAxisMoney(value: number) {
  const n = Number(value);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

function ProfitTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: {
    payload: {
      name: string;
      profit: number;
      revenue?: number;
      costs?: number;
      subtitle?: string;
    };
  }[];
}) {
  if (!active || !payload?.[0]) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm shadow-lg">
      <div className="font-semibold">{row.name}</div>
      {row.subtitle ? (
        <div className="text-xs opacity-60">{row.subtitle}</div>
      ) : null}
      <div
        className={`mt-1 font-medium ${row.profit >= 0 ? "text-success" : "text-error"}`}
      >
        Profit {money(row.profit)}
      </div>
    </div>
  );
}

export function ChartCard({
  title,
  children,
  empty,
  compact,
}: {
  title: string;
  children: React.ReactNode;
  empty?: boolean;
  compact?: boolean;
}) {
  const heightClass = compact ? "h-56" : "h-72";
  return (
    <div className="min-w-0 rounded-box border border-base-300/80 bg-base-100/80 p-4">
      <h3 className="mb-3 break-words font-semibold leading-snug">{title}</h3>
      {empty ? (
        <div
          className={`flex ${heightClass} items-center justify-center text-sm opacity-60`}
        >
          Not enough data yet for this chart.
        </div>
      ) : (
        <div className={`${heightClass} w-full`}>{children}</div>
      )}
    </div>
  );
}

export function RevenueCostChart({
  data,
}: {
  data: { month: string; revenue: number; costs: number }[];
}) {
  return (
    <ChartCard title="Revenue vs Cost by Month" empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} />
          <Line type="monotone" dataKey="costs" stroke="#f97316" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ClientProfitChart({
  data,
  title = "Profitability by client",
  compact,
}: {
  data: {
    name: string;
    revenue: number;
    costs: number;
    profit: number;
    subtitle?: string;
  }[];
  title?: string;
  compact?: boolean;
}) {
  const chartData = data.map((d) => ({
    ...d,
    shortName: d.name.length > 22 ? `${d.name.slice(0, 20)}…` : d.name,
  }));

  return (
    <ChartCard title={title} empty={!data.length} compact={compact}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            opacity={0.25}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }}
            tickFormatter={formatAxisMoney}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            width={128}
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.8 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "currentColor", opacity: 0.04 }}
            content={<ProfitTooltip />}
          />
          <ReferenceLine x={0} stroke="currentColor" strokeOpacity={0.25} />
          <Bar dataKey="profit" name="Profit" radius={[0, 8, 8, 0]} barSize={18}>
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.profit >= 0 ? "#16a34a" : "#e11d48"}
                fillOpacity={0.9}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function BudgetActualChart({
  data,
}: {
  data: { name: string; budget: number; actual: number }[];
}) {
  return (
    <ChartCard title="Campaign Budget vs Actual Cost" empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="name" hide />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="budget" fill="#818cf8" />
          <Bar dataKey="actual" fill="#f43f5e" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function RevenueByTypeChart({
  data,
}: {
  data: { type: string; revenue: number }[];
}) {
  return (
    <ChartCard title="Revenue by Campaign Type" empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="type" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="revenue" fill="#14b8a6" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ArAgingChart({
  data,
}: {
  data: { bucket: string; amount: number }[];
}) {
  return (
    <ChartCard title="Accounts Receivable Aging" empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="bucket" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="amount" fill="#eab308" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function MarginChart({
  data,
}: {
  data: { name: string; margin: number }[];
}) {
  return (
    <ChartCard title="Campaign Profit Margin %" empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="name" hide />
          <YAxis />
          <Tooltip />
          <Bar dataKey="margin" fill="#a78bfa" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function MonthlySeriesChart({
  title,
  data,
  dataKey,
  color,
}: {
  title: string;
  data: { month: string; [key: string]: string | number }[];
  dataKey: string;
  color: string;
}) {
  return (
    <ChartCard title={title} empty={!data.length} compact>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={48} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function EmployeeTrackChart({
  data,
}: {
  data: { name: string; value: number; fill: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const onTrack = data.find((d) => d.name === "On track")?.value ?? 0;
  const healthy = total > 0 ? Math.round((onTrack / total) * 100) : 0;

  return (
    <ChartCard title="Projects on track" empty={!total} compact>
      <div className="relative h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                `${Number(value)} tasks`,
                String(name),
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={28}
              formatter={(value) => (
                <span className="text-xs opacity-80">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
          <div className="text-2xl font-bold tabular-nums">{healthy}%</div>
          <div className="text-[10px] uppercase tracking-wide opacity-60">
            on track
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

export function EmployeeBudgetChart({
  data,
}: {
  data: { name: string; value: number; fill: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const under = data.find((d) => d.name === "Under budget")?.value ?? 0;
  const near = data.find((d) => d.name === "Near limit")?.value ?? 0;
  const healthy = total > 0 ? Math.round(((under + near) / total) * 100) : 0;

  return (
    <ChartCard title="Campaigns on budget" empty={!total} compact>
      <div className="relative h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                `${Number(value)} campaigns`,
                String(name),
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={28}
              formatter={(value) => (
                <span className="text-xs opacity-80">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
          <div className="text-2xl font-bold tabular-nums">{healthy}%</div>
          <div className="text-[10px] uppercase tracking-wide opacity-60">
            healthy
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

export function EmployeePerformanceChart({
  data,
}: {
  data: { name: string; hours: number }[];
}) {
  return (
    <ChartCard title="Employee hours (30 days)" empty={!data.length} compact>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={88}
            tick={{ fontSize: 11 }}
          />
          <Tooltip />
          <Bar dataKey="hours" fill="#0ea5e9" name="Hours" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
