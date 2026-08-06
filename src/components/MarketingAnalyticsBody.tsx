"use client";

import {
  CtrByCampaignChart,
  ImpressionsClicksTrendChart,
} from "@/components/Charts";
import { ClientAnalyticsPicker } from "@/components/ClientAnalyticsPicker";
import { ClientGrowthSection } from "@/components/ClientGrowthSection";
import type { StrategyRow } from "@/components/ClientGrowthSection";
import {
  CustomizeLayoutButton,
  DashboardCustomizePanel,
} from "@/components/dashboards/DashboardCustomizePanel";
import { PortfolioGrowthSection } from "@/components/PortfolioGrowthSection";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";
import { money, moneyExact } from "@/lib/format";
import {
  MARKETING_ANALYTICS_SECTIONS,
  MARKETING_ANALYTICS_STORAGE,
  type MarketingAnalyticsSectionId,
} from "@/lib/marketing-analytics-layout";
import { useDashboardLayout } from "@/lib/use-dashboard-layout";

export type MarketingAnalyticsBodyProps = {
  userId: string;
  scopedClients: { id: string; name: string }[];
  selectedId: string;
  selectedName: string;
  hasCampaigns: boolean;
  hasMetrics: boolean;
  portfolio: {
    activeClients: number;
    newClientsQuarter: number;
    activeCampaigns: number;
    conversions30d: number;
    newClientsByMonth: { month: string; count: number }[];
  };
  growth: {
    clicksDeltaPct: number | null;
    conversionsDeltaPct: number | null;
    spendDeltaPct: number | null;
    cpaDeltaPct: number | null;
    strategySpendPie: { name: string; value: number }[];
    strategyConversionsBars: { name: string; conversions: number }[];
    strategyRows: StrategyRow[];
  };
  totals: {
    impressions: number;
    clicks: number;
    ctrPct: number;
    conversions: number;
    spend: number;
    cpc: number;
    cpa: number;
  };
  trendSeries: {
    date: string;
    impressions: number;
    clicks: number;
  }[];
  ctrByCampaign: { name: string; ctr: number }[];
  tableRows: {
    id: string;
    name: string;
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
    spend: number;
    cpc: number;
    cpa: number;
  }[];
};

export function MarketingAnalyticsBody(props: MarketingAnalyticsBodyProps) {
  const layout = useDashboardLayout({
    userId: props.userId,
    storagePrefix: MARKETING_ANALYTICS_STORAGE,
    sections: MARKETING_ANALYTICS_SECTIONS,
  });

  function renderSection(id: MarketingAnalyticsSectionId) {
    switch (id) {
      case "portfolio_growth":
        return (
          <PortfolioGrowthSection
            activeClients={props.portfolio.activeClients}
            newClientsQuarter={props.portfolio.newClientsQuarter}
            activeCampaigns={props.portfolio.activeCampaigns}
            conversions30d={props.portfolio.conversions30d}
            newClientsByMonth={props.portfolio.newClientsByMonth}
          />
        );
      case "client_growth":
        if (!props.hasCampaigns || !props.hasMetrics) return null;
        return (
          <ClientGrowthSection
            clicksDeltaPct={props.growth.clicksDeltaPct}
            conversionsDeltaPct={props.growth.conversionsDeltaPct}
            spendDeltaPct={props.growth.spendDeltaPct}
            cpaDeltaPct={props.growth.cpaDeltaPct}
            strategySpendPie={props.growth.strategySpendPie}
            strategyConversionsBars={props.growth.strategyConversionsBars}
            strategyRows={props.growth.strategyRows}
          />
        );
      case "kpis":
        if (!props.hasCampaigns || !props.hasMetrics) return null;
        return (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <StatCard
              label="Impressions"
              value={props.totals.impressions.toLocaleString()}
            />
            <StatCard
              label="Clicks"
              value={props.totals.clicks.toLocaleString()}
            />
            <StatCard label="CTR" value={`${props.totals.ctrPct}%`} />
            <StatCard
              label="Conversions"
              value={props.totals.conversions.toLocaleString()}
            />
            <StatCard label="Spend" value={money(props.totals.spend)} />
            <StatCard label="CPC" value={moneyExact(props.totals.cpc)} />
            <StatCard
              label="Cost / conv."
              value={
                props.totals.conversions > 0
                  ? moneyExact(props.totals.cpa)
                  : "—"
              }
            />
          </div>
        );
      case "charts":
        if (!props.hasCampaigns || !props.hasMetrics) return null;
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <ImpressionsClicksTrendChart data={props.trendSeries} />
            </div>
            <div className="lg:col-span-2">
              <CtrByCampaignChart data={props.ctrByCampaign} />
            </div>
          </div>
        );
      case "campaign_breakdown":
        if (!props.hasCampaigns || !props.hasMetrics) return null;
        return (
          <section>
            <h3 className="mb-3 text-lg font-bold">Campaign breakdown</h3>
            <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
              <table className="table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th className="text-right">Impressions</th>
                    <th className="text-right">Clicks</th>
                    <th className="text-right">CTR</th>
                    <th className="text-right">Conversions</th>
                    <th className="text-right">Spend</th>
                    <th className="text-right">CPC</th>
                    <th className="text-right">CPA</th>
                  </tr>
                </thead>
                <tbody>
                  {props.tableRows.map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium">{r.name}</td>
                      <td className="text-right">
                        {r.impressions.toLocaleString()}
                      </td>
                      <td className="text-right">
                        {r.clicks.toLocaleString()}
                      </td>
                      <td className="text-right">{r.ctr}%</td>
                      <td className="text-right">
                        {r.conversions.toLocaleString()}
                      </td>
                      <td className="text-right">{money(r.spend)}</td>
                      <td className="text-right">
                        {r.clicks > 0 ? moneyExact(r.cpc) : "—"}
                      </td>
                      <td className="text-right">
                        {r.conversions > 0 ? moneyExact(r.cpa) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      default:
        return null;
    }
  }

  const clientSections = layout.visible.filter((id) => id !== "portfolio_growth");
  const showPortfolio = layout.visible.includes("portfolio_growth");
  const clientBlocks = clientSections
    .map((id) => ({ id, node: renderSection(id) }))
    .filter((b) => b.node != null);
  const allHidden =
    props.hasCampaigns &&
    props.hasMetrics &&
    !showPortfolio &&
    clientBlocks.length === 0;

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Portfolio growth and digital performance by client strategy"
        actions={
          <CustomizeLayoutButton onClick={() => layout.setPanelOpen(true)} />
        }
      />

      {showPortfolio ? renderSection("portfolio_growth") : null}

      <div className="mb-6">
        <ClientAnalyticsPicker
          clients={props.scopedClients}
          selectedId={props.selectedId}
        />
      </div>

      <h2 className="mb-3 text-lg font-bold text-[#0b1f3a]">
        {props.selectedName}
      </h2>

      {!props.hasCampaigns ? (
        <EmptyState
          title="No campaigns for this client"
          description="Staff this client’s campaigns to see performance here."
        />
      ) : !props.hasMetrics ? (
        <EmptyState
          title="No metrics yet"
          description="Impressions, clicks, and conversions will show once campaign metrics are available."
        />
      ) : allHidden ? (
        <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 p-10 text-center">
          <p className="font-semibold">All sections are hidden</p>
          <p className="mt-1 text-sm opacity-60">
            Use Customize layout to show analytics sections again.
          </p>
          <CustomizeLayoutButton
            className="btn btn-primary btn-sm mt-4 gap-2"
            onClick={() => layout.setPanelOpen(true)}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {clientBlocks.map(({ id, node }) => (
            <div key={id}>{node}</div>
          ))}
        </div>
      )}

      {layout.panelOpen ? (
        <DashboardCustomizePanel
          prefs={layout.prefs}
          sections={MARKETING_ANALYTICS_SECTIONS}
          onClose={() => layout.setPanelOpen(false)}
          onToggle={layout.toggleHidden}
          onMove={layout.move}
          onRestore={layout.restoreDefaults}
        />
      ) : null}
    </div>
  );
}
