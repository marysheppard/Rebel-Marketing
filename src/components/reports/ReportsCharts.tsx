"use client";

import {
  ApprovalStatusPieChart,
  CampaignBudgetHealthChart,
  ChartCard,
  ClientProfitChart,
  buildCountDonutSlices,
} from "@/components/Charts";
import { money } from "@/lib/format";
import type { BudgetRow, ProfitRow, UnbilledRow } from "@/components/reports/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatAxisMoney(value: number) {
  const n = Number(value);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

export function ReportsCharts({
  clientProfit,
  campaignProfit,
  budgetPerf,
  approvalStatus,
  unbilled,
}: {
  clientProfit: ProfitRow[];
  campaignProfit: ProfitRow[];
  budgetPerf: BudgetRow[];
  approvalStatus: { name: string; value: number }[];
  unbilled: UnbilledRow[];
}) {
  const healthCounts = [
    {
      bucket: "Under",
      count: budgetPerf.filter((r) => r.health === "under").length,
    },
    {
      bucket: "Near",
      count: budgetPerf.filter((r) => r.health === "near").length,
    },
    {
      bucket: "Over",
      count: budgetPerf.filter((r) => r.health === "over").length,
    },
  ];

  const campaignBars = [...campaignProfit]
    .sort((a, b) => a.profit - b.profit)
    .slice(0, 10)
    .map((r) => ({
      name: r.name.length > 18 ? `${r.name.slice(0, 16)}…` : r.name,
      fullName: r.name,
      revenue: r.revenue,
      costs: r.costs,
      profit: r.profit,
    }));

  const budgetUse = [...budgetPerf]
    .sort((a, b) => b.pctUsed - a.pctUsed)
    .slice(0, 10)
    .map((r) => ({
      name: r.name.length > 16 ? `${r.name.slice(0, 14)}…` : r.name,
      fullName: r.name,
      pctUsed: Math.min(Math.round(r.pctUsed), 150),
      health: r.health,
      spent: r.spent,
      budget: r.budget,
    }));

  const unbilledBars = [...unbilled]
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 8)
    .map((r) => ({
      name:
        r.campaignName.length > 16
          ? `${r.campaignName.slice(0, 14)}…`
          : r.campaignName,
      hours: Number(r.hours.toFixed(1)),
    }));

  const approvalSlices = buildCountDonutSlices(approvalStatus, {
    Pending: "oklch(70% 0.12 55)",
    "Changes Requested": "oklch(72% 0.1 300)",
    Approved: "oklch(68% 0.12 160)",
    Rejected: "oklch(62% 0.18 25)",
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ClientProfitChart
        title="Profit by client"
        filterable
        compact
        data={clientProfit.map((r) => ({
          name: r.name,
          revenue: r.revenue,
          costs: r.costs,
          profit: r.profit,
        }))}
      />

      <ChartCard title="Campaign revenue vs cost" empty={!campaignBars.length} compact>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={campaignBars} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis type="number" tickFormatter={formatAxisMoney} />
            <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value) => money(Number(value))}
              labelFormatter={(_, payload) =>
                String(payload?.[0]?.payload?.fullName ?? "")
              }
            />
            <Bar dataKey="revenue" fill="#38bdf8" name="Revenue" />
            <Bar dataKey="costs" fill="#fb923c" name="Costs" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <CampaignBudgetHealthChart data={healthCounts} />

      <ChartCard title="Budget utilization %" empty={!budgetUse.length} compact>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={budgetUse} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis type="number" domain={[0, 150]} unit="%" />
            <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value) => `${value}%`}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as
                  | { fullName?: string; spent?: number; budget?: number }
                  | undefined;
                if (!row) return "";
                return `${row.fullName} · ${money(row.spent ?? 0)} / ${money(row.budget ?? 0)}`;
              }}
            />
            <Bar dataKey="pctUsed" name="% used">
              {budgetUse.map((entry) => (
                <Cell
                  key={entry.fullName}
                  fill={
                    entry.health === "over"
                      ? "#ef4444"
                      : entry.health === "near"
                        ? "#f59e0b"
                        : "#22c55e"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ApprovalStatusPieChart
        slices={approvalSlices}
        layout="stacked"
        showDetailsCard={false}
      />

      <ChartCard title="Unbilled hours by campaign" empty={!unbilledBars.length} compact>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={unbilledBars}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis dataKey="name" hide={unbilledBars.length > 5} tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="hours" fill="#0b1f3a" name="Hours" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
