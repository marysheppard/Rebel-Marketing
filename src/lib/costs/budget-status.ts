export type CampaignBudgetStatus =
  | "healthy"
  | "monitor"
  | "near_budget"
  | "over_budget"
  | "missing_budget";

export const BUDGET_STATUS_LABELS: Record<CampaignBudgetStatus, string> = {
  healthy: "Healthy",
  monitor: "Monitor",
  near_budget: "Near Budget",
  over_budget: "Over Budget",
  missing_budget: "Missing Budget",
};

/**
 * Costs-dashboard budget health bands (distinct from global budgetHealth).
 * Healthy: <70%, Monitor: 70–89.99%, Near: 90–100%, Over: >100%.
 */
export function campaignBudgetStatus(
  budget: number | null | undefined,
  actual: number,
): CampaignBudgetStatus {
  const b = Number(budget ?? 0);
  if (!Number.isFinite(b) || b <= 0) return "missing_budget";
  const used = actual / b;
  if (used > 1) return "over_budget";
  if (used >= 0.9) return "near_budget";
  if (used >= 0.7) return "monitor";
  return "healthy";
}

export function budgetUtilization(
  budget: number | null | undefined,
  actual: number,
): number | null {
  const b = Number(budget ?? 0);
  if (!Number.isFinite(b) || b <= 0) return null;
  return (actual / b) * 100;
}
