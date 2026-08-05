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
} from "recharts";

export function ChartCard({
  title,
  children,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {empty ? (
        <div className="flex h-56 items-center justify-center text-sm opacity-60">
          Not enough data yet for this chart.
        </div>
      ) : (
        <div className="h-64 w-full">{children}</div>
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
}: {
  data: { name: string; revenue: number; costs: number; profit: number }[];
}) {
  return (
    <ChartCard title="Profitability by Client" empty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="name" hide />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="revenue" fill="#38bdf8" />
          <Bar dataKey="costs" fill="#fb923c" />
          <Bar dataKey="profit" fill="#4ade80" />
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

const APPROVAL_STATUS_COLORS: Record<string, string> = {
  Pending: "#eab308",
  "Changes Requested": "#f97316",
  Approved: "#22c55e",
  Rejected: "#ef4444",
};

export function ApprovalStatusPieChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const chartData = data.filter((d) => d.value > 0);

  return (
    <ChartCard title="Approvals by status" empty={!chartData.length}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, value }) => `${name}: ${value}`}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={APPROVAL_STATUS_COLORS[entry.name] ?? "#94a3b8"}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
