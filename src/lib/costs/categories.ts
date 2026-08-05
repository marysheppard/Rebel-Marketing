/** Four controlled dashboard cost categories (type wins over pass_through). */

export const COST_CATEGORIES = [
  "advertising",
  "vendor_freelancer",
  "employee_labor",
  "pass_through",
] as const;

export type CostCategory = (typeof COST_CATEGORIES)[number];

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  advertising: "Advertising Spend",
  vendor_freelancer: "Vendor/Freelancer Cost",
  employee_labor: "Employee Labor Cost",
  pass_through: "Reimbursable/Pass-Through Expense",
};

/** Stable theme colors for charts/cards — same token per category everywhere. */
export const COST_CATEGORY_COLORS: Record<CostCategory, string> = {
  advertising: "oklch(65% 0.14 250)",
  vendor_freelancer: "oklch(70% 0.12 55)",
  employee_labor: "oklch(68% 0.12 160)",
  pass_through: "oklch(72% 0.1 300)",
};

const TYPE_TO_CATEGORY: Record<string, CostCategory> = {
  // Live DB CHECK values (Rebel Marketing)
  "Ad spend": "advertising",
  "Vendor/freelancer costs": "vendor_freelancer",
  "Employee labor cost": "employee_labor",
  "Reimbursable/pass-through expenses": "pass_through",
  "Software/tool subscription costs": "vendor_freelancer",
  "Stock media licensing": "vendor_freelancer",
  "Production costs": "vendor_freelancer",
  "Travel expenses": "vendor_freelancer",
  "Rush/overtime fees": "vendor_freelancer",
  "Platform/processing fees": "vendor_freelancer",
  Other: "vendor_freelancer",
  // Legacy / alias labels
  "Advertising Spend": "advertising",
  "Ad Spend": "advertising",
  "Media Spend": "advertising",
  "Paid Media": "advertising",
  "Google Ads": "advertising",
  "Meta Ads": "advertising",
  "LinkedIn Ads": "advertising",
  "TikTok Ads": "advertising",
  "Display Ads": "advertising",
  "Sponsored Media": "advertising",
  Contractor: "vendor_freelancer",
  Vendor: "vendor_freelancer",
  "Vendor Cost": "vendor_freelancer",
  "Freelancer Cost": "vendor_freelancer",
  "Contractor Cost": "vendor_freelancer",
  Production: "vendor_freelancer",
  Software: "vendor_freelancer",
  Travel: "vendor_freelancer",
  Materials: "vendor_freelancer",
  "Employee Labor": "employee_labor",
  Labor: "employee_labor",
  "Internal Labor": "employee_labor",
  "Staff Time": "employee_labor",
  "Pass-Through": "pass_through",
  "Pass Through": "pass_through",
  "Reimbursable Expense": "pass_through",
};

/**
 * Map a raw DB/form cost_type into one of the four dashboard categories.
 * Type wins: pass_through boolean does not reclassify (decision 1B).
 * Returns null for unrecognized types (exclude from totals; flag for cleanup).
 */
export function normalizeCostCategory(
  costType: string | null | undefined,
): CostCategory | null {
  if (!costType) return null;
  const trimmed = costType.trim();
  if (!trimmed) return null;
  if (TYPE_TO_CATEGORY[trimmed]) return TYPE_TO_CATEGORY[trimmed];
  const lower = trimmed.toLowerCase();
  for (const [key, cat] of Object.entries(TYPE_TO_CATEGORY)) {
    if (key.toLowerCase() === lower) return cat;
  }
  return null;
}

export function categoryLabel(category: CostCategory | null): string {
  if (!category) return "Requires data cleanup";
  return COST_CATEGORY_LABELS[category];
}
