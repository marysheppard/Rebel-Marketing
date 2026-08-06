import type { DashboardSectionDef } from "@/lib/dashboard-layout";

export const MARKETING_ANALYTICS_SECTIONS = [
  {
    id: "portfolio_growth",
    label: "Portfolio growth",
    description: "Active clients, new this quarter, and conversions",
  },
  {
    id: "client_growth",
    label: "Client growth",
    description: "Period deltas and strategy mix for the selected client",
  },
  {
    id: "kpis",
    label: "Performance metrics",
    description: "Impressions, clicks, CTR, spend, and costs",
  },
  {
    id: "charts",
    label: "Trend charts",
    description: "Impressions & clicks trend and CTR by campaign",
  },
  {
    id: "campaign_breakdown",
    label: "Campaign breakdown",
    description: "Per-campaign metrics table",
  },
] as const satisfies readonly DashboardSectionDef[];

export type MarketingAnalyticsSectionId =
  (typeof MARKETING_ANALYTICS_SECTIONS)[number]["id"];

export const MARKETING_ANALYTICS_STORAGE =
  "rebel.marketing-analytics.layout.v1";
