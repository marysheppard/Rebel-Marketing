import { describe, expect, it } from "vitest";
import {
  normalizeCostCategory,
  COST_CATEGORY_LABELS,
} from "./categories";

describe("normalizeCostCategory", () => {
  it("maps advertising variants", () => {
    expect(normalizeCostCategory("Ad spend")).toBe("advertising");
    expect(normalizeCostCategory("Advertising Spend")).toBe("advertising");
    expect(normalizeCostCategory("Google Ads")).toBe("advertising");
  });

  it("maps vendor/freelancer types including Software/Production/Other", () => {
    expect(normalizeCostCategory("Vendor/freelancer costs")).toBe("vendor_freelancer");
    expect(normalizeCostCategory("Production costs")).toBe("vendor_freelancer");
    expect(normalizeCostCategory("Software/tool subscription costs")).toBe(
      "vendor_freelancer",
    );
    expect(normalizeCostCategory("Travel expenses")).toBe("vendor_freelancer");
    expect(normalizeCostCategory("Other")).toBe("vendor_freelancer");
  });

  it("maps employee labor", () => {
    expect(normalizeCostCategory("Employee labor cost")).toBe("employee_labor");
    expect(normalizeCostCategory("Employee Labor")).toBe("employee_labor");
  });

  it("maps pass-through type (type wins; not from boolean)", () => {
    expect(normalizeCostCategory("Reimbursable/pass-through expenses")).toBe(
      "pass_through",
    );
    expect(normalizeCostCategory("Pass-Through")).toBe("pass_through");
  });

  it("returns null for unrecognized types", () => {
    expect(normalizeCostCategory("Mystery Fee")).toBeNull();
    expect(normalizeCostCategory("")).toBeNull();
    expect(normalizeCostCategory(null)).toBeNull();
  });

  it("exposes labels for all four categories", () => {
    expect(COST_CATEGORY_LABELS.advertising).toBe("Advertising Spend");
    expect(COST_CATEGORY_LABELS.vendor_freelancer).toContain("Vendor");
    expect(COST_CATEGORY_LABELS.employee_labor).toContain("Labor");
    expect(COST_CATEGORY_LABELS.pass_through).toContain("Pass-Through");
  });
});
