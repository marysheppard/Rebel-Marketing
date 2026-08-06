"use client";

import { useMemo, useState } from "react";
import {
  StrategyConversionsBarChart,
  StrategySpendPieChart,
  buildStrategyDonutSlices,
} from "@/components/Charts";
import { money, moneyExact } from "@/lib/format";
import { StatCard } from "@/components/ui";

export type StrategyRow = {
  type: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  ctr: number;
  cpa: number;
  conversionsDeltaPct: number | null;
};

function formatDelta(pct: number | null) {
  if (pct == null) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
}

function deltaTone(pct: number | null): "good" | "bad" | "neutral" {
  if (pct == null || pct === 0) return "neutral";
  return pct > 0 ? "good" : "bad";
}

export function ClientGrowthSection({
  clicksDeltaPct,
  conversionsDeltaPct,
  spendDeltaPct,
  cpaDeltaPct,
  strategySpendPie: _strategySpendPie,
  strategyConversionsBars,
  strategyRows,
}: {
  clicksDeltaPct: number | null;
  conversionsDeltaPct: number | null;
  spendDeltaPct: number | null;
  cpaDeltaPct: number | null;
  strategySpendPie?: { name: string; value: number }[];
  strategyConversionsBars: { name: string; conversions: number }[];
  strategyRows: StrategyRow[];
}) {
  const [strategyFilter, setStrategyFilter] = useState<string | null>(null);

  const slices = useMemo(
    () => buildStrategyDonutSlices(strategyRows),
    [strategyRows],
  );

  const filteredRows = useMemo(() => {
    if (!strategyFilter) return strategyRows;
    return strategyRows.filter((r) => r.type === strategyFilter);
  }, [strategyRows, strategyFilter]);

  const filteredBars = useMemo(() => {
    if (!strategyFilter) return strategyConversionsBars;
    return strategyConversionsBars.filter((r) => r.name === strategyFilter);
  }, [strategyConversionsBars, strategyFilter]);

  return (
    <section className="mb-8">
      <h3 className="mb-3 text-lg font-bold text-[#0b1f3a]">
        Growth vs prior 30 days
      </h3>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Clicks Δ"
          value={formatDelta(clicksDeltaPct)}
          hint="Last 30d vs prior 30d"
          tone={deltaTone(clicksDeltaPct)}
        />
        <StatCard
          label="Conversions Δ"
          value={formatDelta(conversionsDeltaPct)}
          hint="Last 30d vs prior 30d"
          tone={deltaTone(conversionsDeltaPct)}
        />
        <StatCard
          label="Spend Δ"
          value={formatDelta(spendDeltaPct)}
          hint="Last 30d vs prior 30d"
          tone={deltaTone(spendDeltaPct)}
        />
        <StatCard
          label="CPA Δ"
          value={formatDelta(cpaDeltaPct)}
          hint="Lower is better"
          tone={
            cpaDeltaPct == null || cpaDeltaPct === 0
              ? "neutral"
              : cpaDeltaPct < 0
                ? "good"
                : "bad"
          }
        />
      </div>

      <h3 className="mb-3 text-lg font-bold text-[#0b1f3a]">
        By marketing strategy
      </h3>
      <div className="mb-4 space-y-4">
        <StrategySpendPieChart
          slices={slices}
          selectedKey={strategyFilter}
          onSelectKey={setStrategyFilter}
          onClearSelection={() => setStrategyFilter(null)}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <StrategyConversionsBarChart data={filteredBars} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
        <table className="table">
          <thead>
            <tr>
              <th>Strategy</th>
              <th className="text-right">Spend</th>
              <th className="text-right">Clicks</th>
              <th className="text-right">Conversions</th>
              <th className="text-right">CTR</th>
              <th className="text-right">CPA</th>
              <th className="text-right">Conv. Δ</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-sm opacity-60">
                  {strategyFilter
                    ? `No rows for “${strategyFilter}”.`
                    : "No strategy metrics in the last 30 days."}
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r.type}>
                  <td className="font-medium">{r.type}</td>
                  <td className="text-right">{money(r.spend)}</td>
                  <td className="text-right">{r.clicks.toLocaleString()}</td>
                  <td className="text-right">
                    {r.conversions.toLocaleString()}
                  </td>
                  <td className="text-right">{r.ctr}%</td>
                  <td className="text-right">
                    {r.conversions > 0 ? moneyExact(r.cpa) : "—"}
                  </td>
                  <td
                    className={`text-right ${
                      r.conversionsDeltaPct != null &&
                      r.conversionsDeltaPct > 0
                        ? "text-success"
                        : r.conversionsDeltaPct != null &&
                            r.conversionsDeltaPct < 0
                          ? "text-error"
                          : ""
                    }`}
                  >
                    {formatDelta(r.conversionsDeltaPct)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
