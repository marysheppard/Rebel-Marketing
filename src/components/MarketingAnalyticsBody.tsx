"use client";

import {
  CampaignCtrRankingChart,
  CampaignVolumeRankingChart,
  MarketingMediaTrendChart,
} from "@/components/Charts";
import { ClientAnalyticsPicker } from "@/components/ClientAnalyticsPicker";
import { CampaignBreakdownTable } from "@/components/CampaignBreakdownTable";
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
import { PERIOD_OPTIONS, type PeriodKey } from "@/lib/period";
import { useDashboardLayout } from "@/lib/use-dashboard-layout";
import { usePeriodParam } from "@/lib/use-period-param";
import { Suspense } from "react";

const MARKETING_PERIODS = PERIOD_OPTIONS.filter((o) => o.value !== "custom");

export type MarketingAnalyticsBodyProps = {
  userId: string;
  scopedClients: { id: string; name: string }[];
  selectedId: string;
  selectedName: string;
  allClientsMode?: boolean;
  hasCampaigns: boolean;
  hasMetrics: boolean;
  periodKey: PeriodKey;
  periodLabel: string;
  portfolio: {
    activeClients: number;
    newClientsQuarter: number;
    activeCampaigns: number;
    conversions30d: number;
    portfolioByMonth: {
      month: string;
      conversions: number;
      spend: number;
      clicks: number;
    }[];
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
    label: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    ctr: number;
  }[];
  ctrByCampaign: {
    name: string;
    ctr: number;
    impressions: number;
    clicks: number;
  }[];
  clicksByCampaign: {
    name: string;
    clicks: number;
    impressions: number;
    ctr: number;
  }[];
  impressionsByCampaign: {
    name: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }[];
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

function MarketingPeriodSelect() {
  const { period, setPeriod } = usePeriodParam("last30");
  return (
    <label className="flex max-w-xs flex-col gap-1">
      <span className="text-sm font-medium opacity-70">Time period</span>
      <select
        className="select select-bordered w-full"
        value={period}
        onChange={(e) => setPeriod(e.target.value as PeriodKey)}
      >
        {MARKETING_PERIODS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MarketingAnalyticsBody(props: MarketingAnalyticsBodyProps) {
  const layout = useDashboardLayout({
    userId: props.userId,
    storagePrefix: MARKETING_ANALYTICS_STORAGE,
    sections: MARKETING_ANALYTICS_SECTIONS,
  });
  const periodHint = props.periodLabel;

  function renderSection(id: MarketingAnalyticsSectionId) {
    switch (id) {
      case "portfolio_growth":
        return (
          <PortfolioGrowthSection
            activeClients={props.portfolio.activeClients}
            newClientsQuarter={props.portfolio.newClientsQuarter}
            activeCampaigns={props.portfolio.activeCampaigns}
            conversions30d={props.portfolio.conversions30d}
            portfolioByMonth={props.portfolio.portfolioByMonth}
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
            periodLabel={periodHint}
          />
        );
      case "kpis":
        if (!props.hasCampaigns || !props.hasMetrics) return null;
        return (
          <div>
            <p className="mb-2 text-xs opacity-60">KPIs for {periodHint}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <StatCard
                label="Impressions"
                value={props.totals.impressions.toLocaleString()}
                hint={periodHint}
              />
              <StatCard
                label="Clicks"
                value={props.totals.clicks.toLocaleString()}
                hint={periodHint}
              />
              <StatCard
                label="CTR"
                value={`${props.totals.ctrPct}%`}
                hint={periodHint}
              />
              <StatCard
                label="Conversions"
                value={props.totals.conversions.toLocaleString()}
                hint={periodHint}
              />
              <StatCard
                label="Spend"
                value={money(props.totals.spend)}
                hint={periodHint}
              />
              <StatCard
                label="CPC"
                value={moneyExact(props.totals.cpc)}
                hint={periodHint}
              />
              <StatCard
                label="Cost / conv."
                value={
                  props.totals.conversions > 0
                    ? moneyExact(props.totals.cpa)
                    : "—"
                }
                hint={periodHint}
              />
            </div>
          </div>
        );
      case "charts":
        if (!props.hasCampaigns || !props.hasMetrics) return null;
        return (
          <div className="grid gap-4">
            <MarketingMediaTrendChart
              data={props.trendSeries}
              periodLabel={periodHint}
            />
            <CampaignVolumeRankingChart
              data={props.impressionsByCampaign}
              metric="impressions"
              periodLabel={periodHint}
            />
            <CampaignVolumeRankingChart
              data={props.clicksByCampaign}
              metric="clicks"
              periodLabel={periodHint}
            />
            <CampaignCtrRankingChart
              data={props.ctrByCampaign}
              periodLabel={periodHint}
              averageCtr={props.totals.ctrPct}
            />
          </div>
        );
      case "campaign_breakdown":
        if (!props.hasCampaigns || !props.hasMetrics) return null;
        return (
          <CampaignBreakdownTable
            rows={props.tableRows}
            periodLabel={periodHint}
          />
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

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <ClientAnalyticsPicker
          clients={props.scopedClients}
          selectedId={props.selectedId}
          period={props.periodKey}
        />
        <Suspense
          fallback={
            <label className="flex max-w-xs flex-col gap-1">
              <span className="text-sm font-medium opacity-70">Time period</span>
              <select className="select select-bordered w-full" disabled>
                <option>{props.periodLabel}</option>
              </select>
            </label>
          }
        >
          <MarketingPeriodSelect />
        </Suspense>
      </div>

      <h2 className="mb-3 text-lg font-bold text-[#0b1f3a]">
        {props.selectedName}
      </h2>

      {!props.hasCampaigns ? (
        <EmptyState
          title={
            props.allClientsMode
              ? "No campaigns in scope"
              : "No campaigns for this client"
          }
          description={
            props.allClientsMode
              ? "When you’re staffed on campaigns or own client accounts, performance will show here."
              : "Staff this client’s campaigns to see performance here."
          }
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
