import { describe, expect, it } from "vitest";
import { campaignBudgetStatus, budgetUtilization } from "./budget-status";
import {
  approvalBreakdown,
  buildCampaignBudgetRows,
  buildSummary,
  buildTrendSeries,
  filterCosts,
  passThroughStatusBreakdown,
  percentOfTotal,
  sumByCategory,
  totalFromCategories,
  type CostRow,
  type InvoicePassThroughRow,
} from "./calculations";
import { DEFAULT_FILTERS, resolveDateRange } from "./filters";

function cost(partial: Partial<CostRow> & Pick<CostRow, "id" | "cost_type" | "amount" | "cost_date">): CostRow {
  return {
    campaign_id: "camp-1",
    description: "",
    vendor_name: "",
    approved: true,
    pass_through: false,
    campaigns: {
      campaign_name: "Launch",
      campaign_budget: 10000,
      client_id: "client-1",
      clients: { client_name: "Acme" },
    },
    ...partial,
  };
}

describe("sumByCategory and totals", () => {
  const rows: CostRow[] = [
    cost({ id: "1", cost_type: "Ad spend", amount: 1000, cost_date: "2026-01-15" }),
    cost({ id: "2", cost_type: "Vendor/freelancer costs", amount: 500, cost_date: "2026-01-16" }),
    cost({ id: "3", cost_type: "Employee labor cost", amount: 200, cost_date: "2026-01-17" }),
    cost({ id: "4", cost_type: "Reimbursable/pass-through expenses", amount: 300, cost_date: "2026-01-18" }),
    cost({
      id: "5",
      cost_type: "Ad spend",
      amount: 50,
      cost_date: "2026-01-19",
      approved: false,
    }),
  ];

  it("sums four categories and total equals sum of parts", () => {
    const totals = sumByCategory(rows);
    expect(totals.advertising.amount).toBe(1050);
    expect(totals.vendor_freelancer.amount).toBe(500);
    expect(totals.employee_labor.amount).toBe(200);
    expect(totals.pass_through.amount).toBe(300);
    expect(totalFromCategories(totals)).toBe(2050);
  });

  it("approvedOnly excludes pending from category sums", () => {
    const totals = sumByCategory(rows, { approvedOnly: true });
    expect(totals.advertising.amount).toBe(1000);
    expect(totalFromCategories(totals)).toBe(2000);
  });

  it("does not double-count employee labor (costs rows only)", () => {
    const totals = sumByCategory(rows);
    expect(totals.employee_labor.count).toBe(1);
    expect(totals.employee_labor.amount).toBe(200);
  });

  it("keeps Advertising Spend as advertising even when pass_through true (1B)", () => {
    const withPt = [
      cost({
        id: "a",
        cost_type: "Advertising Spend",
        amount: 100,
        cost_date: "2026-01-01",
        pass_through: true,
      }),
    ];
    const totals = sumByCategory(withPt);
    expect(totals.advertising.amount).toBe(100);
    expect(totals.pass_through.amount).toBe(0);
  });
});

describe("budget status", () => {
  it("classifies bands and missing budget", () => {
    expect(campaignBudgetStatus(1000, 500)).toBe("healthy");
    expect(campaignBudgetStatus(1000, 750)).toBe("monitor");
    expect(campaignBudgetStatus(1000, 950)).toBe("near_budget");
    expect(campaignBudgetStatus(1000, 1100)).toBe("over_budget");
    expect(campaignBudgetStatus(0, 100)).toBe("missing_budget");
    expect(campaignBudgetStatus(null, 100)).toBe("missing_budget");
  });

  it("returns null utilization when budget missing or zero", () => {
    expect(budgetUtilization(0, 100)).toBeNull();
    expect(budgetUtilization(null, 100)).toBeNull();
    expect(budgetUtilization(200, 100)).toBe(50);
  });

  it("buildCampaignBudgetRows uses approved costs only and handles missing budget", () => {
    const rows: CostRow[] = [
      cost({
        id: "1",
        cost_type: "Advertising Spend",
        amount: 800,
        cost_date: "2026-02-01",
        campaign_id: "c1",
        campaigns: { campaign_name: "A", campaign_budget: 1000, client_id: "x" },
      }),
      cost({
        id: "2",
        cost_type: "Contractor",
        amount: 500,
        cost_date: "2026-02-02",
        campaign_id: "c1",
        approved: false,
        campaigns: { campaign_name: "A", campaign_budget: 1000, client_id: "x" },
      }),
      cost({
        id: "3",
        cost_type: "Vendor",
        amount: 100,
        cost_date: "2026-02-03",
        campaign_id: "c2",
        campaigns: { campaign_name: "B", campaign_budget: 0, client_id: "x" },
      }),
    ];
    const built = buildCampaignBudgetRows(rows, "highest_cost", 10);
    const a = built.find((r) => r.campaignId === "c1");
    expect(a?.actual).toBe(800);
    expect(a?.variance).toBe(200);
    const b = built.find((r) => r.campaignId === "c2");
    expect(b?.status).toBe("missing_budget");
    expect(b?.utilization).toBeNull();
  });
});

describe("approval and pass-through", () => {
  it("approvalBreakdown separates approved vs pending", () => {
    const rows = [
      cost({ id: "1", cost_type: "Contractor", amount: 100, cost_date: "2026-01-01", approved: true }),
      cost({ id: "2", cost_type: "Contractor", amount: 40, cost_date: "2026-01-02", approved: false }),
    ];
    const b = approvalBreakdown(rows);
    expect(b.approved.amount).toBe(100);
    expect(b.pending.amount).toBe(40);
    expect(b.rejected.count).toBe(0);
  });

  it("computes approved pass-through not yet billed approx", () => {
    const rows = [
      cost({
        id: "1",
        cost_type: "Pass-Through",
        amount: 1000,
        cost_date: "2026-01-01",
        pass_through: true,
        approved: true,
        campaign_id: "camp-1",
      }),
      cost({
        id: "2",
        cost_type: "Pass-Through",
        amount: 200,
        cost_date: "2026-01-02",
        pass_through: true,
        approved: false,
        campaign_id: "camp-1",
      }),
    ];
    const invoices: InvoicePassThroughRow[] = [
      { id: "i1", campaign_id: "camp-1", status: "Sent", pass_through_amount: 400 },
      { id: "i2", campaign_id: "camp-1", status: "Canceled", pass_through_amount: 999 },
    ];
    const result = passThroughStatusBreakdown(rows, invoices);
    expect(result.approvedPassThrough).toBe(1000);
    expect(result.invoicedPassThrough).toBe(400);
    expect(result.notYetBilled).toBe(600);
  });
});

describe("filters and percent", () => {
  it("resolveDateRange for current month", () => {
    const asOf = new Date("2026-03-15T12:00:00");
    const range = resolveDateRange({ preset: "current_month", startDate: null, endDate: null }, asOf);
    expect(range.start).toBe("2026-03-01");
    expect(range.end).toBe("2026-03-31");
  });

  it("filterCosts applies date and category", () => {
    const rows = [
      cost({ id: "1", cost_type: "Advertising Spend", amount: 10, cost_date: "2026-03-10" }),
      cost({ id: "2", cost_type: "Contractor", amount: 20, cost_date: "2026-03-11" }),
      cost({ id: "3", cost_type: "Advertising Spend", amount: 30, cost_date: "2025-01-01" }),
    ];
    const filtered = filterCosts(
      rows,
      {
        ...DEFAULT_FILTERS,
        preset: "custom",
        startDate: "2026-03-01",
        endDate: "2026-03-31",
        category: "advertising",
      },
      [],
      new Date("2026-03-15"),
    );
    expect(filtered.map((c) => c.id)).toEqual(["1"]);
  });

  it("percentOfTotal handles zero", () => {
    expect(percentOfTotal(50, 0)).toBeNull();
    expect(percentOfTotal(25, 100)).toBe(25);
  });

  it("buildSummary total equals four category cards", () => {
    const rows = [
      cost({ id: "1", cost_type: "Advertising Spend", amount: 100, cost_date: "2026-06-01" }),
      cost({ id: "2", cost_type: "Contractor", amount: 50, cost_date: "2026-06-02" }),
      cost({ id: "3", cost_type: "Employee Labor", amount: 25, cost_date: "2026-06-03" }),
      cost({ id: "4", cost_type: "Pass-Through", amount: 25, cost_date: "2026-06-04" }),
    ];
    const filters = {
      ...DEFAULT_FILTERS,
      preset: "custom" as const,
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    };
    const filtered = filterCosts(rows, filters, [], new Date("2026-06-15"));
    const summary = buildSummary(filtered, filters, rows, new Date("2026-06-15"));
    expect(summary.total).toBe(200);
    expect(
      summary.totals.advertising.amount +
        summary.totals.vendor_freelancer.amount +
        summary.totals.employee_labor.amount +
        summary.totals.pass_through.amount,
    ).toBe(summary.total);
  });
});

describe("buildTrendSeries continuity", () => {
  it("fills empty months across a multi-month range", () => {
    const rows = [
      cost({
        id: "1",
        cost_type: "Ad spend",
        amount: 100,
        cost_date: "2025-11-15",
      }),
      cost({
        id: "2",
        cost_type: "Ad spend",
        amount: 200,
        cost_date: "2026-03-10",
      }),
    ];
    // >120 days → monthly granularity
    const series = buildTrendSeries(rows, "2025-11-01", "2026-03-31");
    expect(series.map((p) => p.period)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
    expect(series[2].total).toBe(0);
    expect(series[0].advertising).toBe(100);
    expect(series[4].advertising).toBe(200);
  });

  it("groups by quarter when requested", () => {
    const rows = [
      cost({
        id: "1",
        cost_type: "Ad spend",
        amount: 100,
        cost_date: "2026-01-15",
      }),
      cost({
        id: "2",
        cost_type: "Ad spend",
        amount: 50,
        cost_date: "2026-02-10",
      }),
      cost({
        id: "3",
        cost_type: "Ad spend",
        amount: 75,
        cost_date: "2026-04-01",
      }),
    ];
    const series = buildTrendSeries(
      rows,
      "2026-01-01",
      "2026-06-30",
      "quarter",
    );
    expect(series.map((p) => p.period)).toEqual(["2026-Q1", "2026-Q2"]);
    expect(series[0].advertising).toBe(150);
    expect(series[1].advertising).toBe(75);
  });

  it("groups by year when requested", () => {
    const rows = [
      cost({
        id: "1",
        cost_type: "Ad spend",
        amount: 100,
        cost_date: "2025-11-15",
      }),
      cost({
        id: "2",
        cost_type: "Ad spend",
        amount: 200,
        cost_date: "2026-03-10",
      }),
    ];
    const series = buildTrendSeries(
      rows,
      "2025-01-01",
      "2026-12-31",
      "year",
    );
    expect(series.map((p) => p.period)).toEqual(["2025", "2026"]);
    expect(series[0].advertising).toBe(100);
    expect(series[1].advertising).toBe(200);
  });
});

describe("resolveDateRange longer windows", () => {
  it("resolves last 24 months", () => {
    const asOf = new Date("2026-08-05T12:00:00");
    const range = resolveDateRange(
      { preset: "last_24_months", startDate: null, endDate: null },
      asOf,
    );
    expect(range.end).toBe("2026-08-05");
    expect(range.start).toBe("2024-08-06");
  });

  it("resolves all_time from earliest cost date", () => {
    const asOf = new Date("2026-08-05T12:00:00");
    const range = resolveDateRange(
      { preset: "all_time", startDate: null, endDate: null },
      asOf,
      { earliestCostDate: "2025-11-01" },
    );
    expect(range.start).toBe("2025-11-01");
    expect(range.end).toBe("2026-08-05");
  });
});
