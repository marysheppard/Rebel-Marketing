import type { DashboardSectionDef } from "@/lib/dashboard-layout";

export const ANALYTICS_DASHBOARD_SECTIONS = [
  {
    id: "overview",
    label: "Agency overview",
    description: "Impressions, clicks, CTR, spend, and ROAS",
  },
  {
    id: "campaign_charts",
    label: "Campaign charts",
    description: "Clicks by campaign and impressions & clicks trend",
  },
  {
    id: "employee_charts",
    label: "Employee charts",
    description: "Clicks and impressions by employee",
  },
  {
    id: "employee_table",
    label: "Employee performance",
    description: "Sortable table of media and hours by person",
  },
] as const satisfies readonly DashboardSectionDef[];

export type AnalyticsDashboardSectionId =
  (typeof ANALYTICS_DASHBOARD_SECTIONS)[number]["id"];

export const ANALYTICS_DASHBOARD_STORAGE =
  "rebel.portfolio-analytics.layout.v1";
