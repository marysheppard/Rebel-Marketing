"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { CostFilterBar } from "@/components/costs/CostFilterBar";
import { CostSummaryCards } from "@/components/costs/CostSummaryCards";
import {
  CostTrendChart,
  CampaignBudgetChart,
} from "@/components/costs/CostCharts";
import { CostsByCategoryChart } from "@/components/costs/CostsByCategoryViz";
import { CostDetailsTable } from "@/components/costs/CostDetailsTable";
import type { CostCategory } from "@/lib/costs/categories";
import {
  buildCampaignBudgetRows,
  buildSummary,
  buildTrendSeries,
  earliestCostDate,
  filterCosts,
  passThroughStatusBreakdown,
  unmappedCostTypes,
  type CampaignSort,
  type CostRow,
  type InvoicePassThroughRow,
} from "@/lib/costs/calculations";
import {
  DEFAULT_FILTERS,
  DATE_PRESET_LABELS,
  DEFAULT_TREND_GROUP,
  parseTrendCategories,
  serializeTrendCategories,
  type ApprovalFilter,
  type BillingFilter,
  type CostFilterState,
  type DatePreset,
  type PassThroughFilter,
  type TrendCategorySelection,
  type TrendGroupBy,
} from "@/lib/costs/filters";
import { num } from "@/lib/format";

type Option = { id: string; label: string };

const PRESET_VALUES: DatePreset[] = [
  "current_month",
  "previous_month",
  "current_quarter",
  "ytd",
  "last_12_months",
  "last_24_months",
  "all_time",
  "custom",
];

const TREND_GROUP_VALUES: TrendGroupBy[] = ["month", "quarter", "year"];

function parseFilters(params: URLSearchParams): CostFilterState {
  const preset = (params.get("preset") as DatePreset) || DEFAULT_FILTERS.preset;
  const category = params.get("category") as CostCategory | null;
  return {
    preset: PRESET_VALUES.includes(preset) ? preset : DEFAULT_FILTERS.preset,
    startDate: params.get("start") || null,
    endDate: params.get("end") || null,
    clientId: params.get("client") || null,
    campaignId: params.get("campaign") || null,
    category:
      category &&
      ["advertising", "vendor_freelancer", "employee_labor", "pass_through"].includes(
        category,
      )
        ? category
        : null,
    approval: (params.get("approval") as ApprovalFilter) || "all",
    passThrough: (params.get("passThrough") as PassThroughFilter) || "all",
    billing: (params.get("billing") as BillingFilter) || "all",
    search: params.get("q") || "",
  };
}

function filtersToParams(filters: CostFilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.preset !== DEFAULT_FILTERS.preset) p.set("preset", filters.preset);
  if (filters.startDate) p.set("start", filters.startDate);
  if (filters.endDate) p.set("end", filters.endDate);
  if (filters.clientId) p.set("client", filters.clientId);
  if (filters.campaignId) p.set("campaign", filters.campaignId);
  if (filters.category) p.set("category", filters.category);
  if (filters.approval !== "all") p.set("approval", filters.approval);
  if (filters.passThrough !== "all") p.set("passThrough", filters.passThrough);
  if (filters.billing !== "all") p.set("billing", filters.billing);
  if (filters.search.trim()) p.set("q", filters.search.trim());
  return p;
}

export function CostDashboard({
  costs,
  invoices,
  clients,
  campaigns,
  showRecordCost,
}: {
  costs: CostRow[];
  invoices: InvoicePassThroughRow[];
  clients: Option[];
  campaigns: Option[];
  showRecordCost: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const campaignSort = (searchParams.get("campSort") as CampaignSort) || "highest_cost";
  const trendGroupParam = searchParams.get("trendGroup") as TrendGroupBy | null;
  const trendGroup: TrendGroupBy =
    trendGroupParam && TREND_GROUP_VALUES.includes(trendGroupParam)
      ? trendGroupParam
      : DEFAULT_TREND_GROUP;
  const trendCategories = useMemo(
    () => parseTrendCategories(searchParams.get("trendCat")),
    [searchParams],
  );

  function withExtras(params: URLSearchParams) {
    if (campaignSort !== "highest_cost") params.set("campSort", campaignSort);
    if (trendGroup !== DEFAULT_TREND_GROUP) params.set("trendGroup", trendGroup);
    const trendCat = serializeTrendCategories(trendCategories);
    if (trendCat) params.set("trendCat", trendCat);
    return params;
  }

  const setFilters = useCallback(
    (patch: Partial<CostFilterState>) => {
      const next = { ...filters, ...patch };
      const params = withExtras(filtersToParams(next));
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- withExtras closes over current URL extras
    [filters, campaignSort, trendGroup, trendCategories, pathname, router],
  );

  const clearFilters = useCallback(() => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }, [pathname, router]);

  const setCampaignSort = useCallback(
    (sort: CampaignSort) => {
      const params = filtersToParams(filters);
      if (sort !== "highest_cost") params.set("campSort", sort);
      if (trendGroup !== DEFAULT_TREND_GROUP) params.set("trendGroup", trendGroup);
      const trendCat = serializeTrendCategories(trendCategories);
      if (trendCat) params.set("trendCat", trendCat);
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [filters, trendGroup, trendCategories, pathname, router],
  );

  const setTrendGroup = useCallback(
    (group: TrendGroupBy) => {
      const params = filtersToParams(filters);
      if (campaignSort !== "highest_cost") params.set("campSort", campaignSort);
      if (group !== DEFAULT_TREND_GROUP) params.set("trendGroup", group);
      const trendCat = serializeTrendCategories(trendCategories);
      if (trendCat) params.set("trendCat", trendCat);
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [filters, campaignSort, trendCategories, pathname, router],
  );

  const setTrendCategories = useCallback(
    (categories: TrendCategorySelection) => {
      const params = filtersToParams(filters);
      if (campaignSort !== "highest_cost") params.set("campSort", campaignSort);
      if (trendGroup !== DEFAULT_TREND_GROUP) params.set("trendGroup", trendGroup);
      const trendCat = serializeTrendCategories(categories);
      if (trendCat) params.set("trendCat", trendCat);
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [filters, campaignSort, trendGroup, pathname, router],
  );

  const rangeOptions = useMemo(
    () => ({ earliestCostDate: earliestCostDate(costs) }),
    [costs],
  );

  const filtered = useMemo(
    () => filterCosts(costs, filters, invoices, new Date(), rangeOptions),
    [costs, filters, invoices, rangeOptions],
  );

  /** Category donut stays unscoped by category so drill-down can compare slices. */
  const categoryChartFilters = useMemo((): CostFilterState => {
    return {
      preset: filters.preset,
      startDate: filters.startDate,
      endDate: filters.endDate,
      clientId: filters.clientId,
      campaignId: filters.campaignId,
      category: null,
      approval: filters.approval,
      passThrough: filters.passThrough,
      billing: filters.billing,
      search: filters.search,
    };
    // Omit filters.category so selecting a category does not rebuild chart data.
  }, [
    filters.preset,
    filters.startDate,
    filters.endDate,
    filters.clientId,
    filters.campaignId,
    filters.approval,
    filters.passThrough,
    filters.billing,
    filters.search,
  ]);
  const categoryChartRows = useMemo(
    () =>
      filterCosts(
        costs,
        categoryChartFilters,
        invoices,
        new Date(),
        rangeOptions,
      ),
    [costs, categoryChartFilters, invoices, rangeOptions],
  );
  const categoryChartSummary = useMemo(
    () =>
      buildSummary(
        categoryChartRows,
        categoryChartFilters,
        costs,
        new Date(),
        rangeOptions,
      ),
    [categoryChartRows, categoryChartFilters, costs, rangeOptions],
  );

  const summary = useMemo(
    () => buildSummary(filtered, filters, costs, new Date(), rangeOptions),
    [filtered, filters, costs, rangeOptions],
  );

  const trend = useMemo(
    () =>
      buildTrendSeries(
        filtered,
        summary.range.start,
        summary.range.end,
        trendGroup,
      ),
    [filtered, summary.range.start, summary.range.end, trendGroup],
  );

  const campaignRows = useMemo(
    () => buildCampaignBudgetRows(filtered, campaignSort),
    [filtered, campaignSort],
  );

  const passThrough = useMemo(
    () => passThroughStatusBreakdown(filtered, invoices),
    [filtered, invoices],
  );

  const spentByCampaign = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filtered) {
      if (!c.campaign_id || !c.approved) continue;
      map.set(c.campaign_id, (map.get(c.campaign_id) ?? 0) + num(c.amount));
    }
    return map;
  }, [filtered]);

  const unmapped = useMemo(() => unmappedCostTypes(costs), [costs]);
  const rangeLabel = `${summary.range.start} → ${summary.range.end} (${DATE_PRESET_LABELS[filters.preset]})`;

  return (
    <div className={pending ? "opacity-80 transition-opacity" : undefined}>
      <PageHeader
        title="Costs"
        subtitle="Track advertising spend, vendor and freelancer costs, employee labor, and reimbursable campaign expenses."
        actions={
          showRecordCost ? (
            <a href="#record-cost" className="btn btn-primary btn-sm">
              Record Cost
            </a>
          ) : null
        }
      />

      <CostFilterBar
        filters={filters}
        onChange={setFilters}
        clients={clients}
        campaigns={campaigns}
        onClear={clearFilters}
      />

      {unmapped.length > 0 ? (
        <div className="alert alert-warning mb-4 text-sm">
          <span>
            Some cost types need data cleanup and are excluded from category
            totals: {unmapped.join(", ")}.
          </span>
        </div>
      ) : null}

      <CostSummaryCards
        totals={summary.totals}
        total={summary.total}
        advertisingDelta={summary.advertisingDelta}
        vendorDelta={summary.vendorDelta}
        laborDelta={summary.laborDelta}
        passThroughApproved={summary.passThroughApproved}
        passThroughNotYetBilled={passThrough.notYetBilled}
        onSelectCategory={(category) => setFilters({ category })}
      />

      <div className="mb-6">
        <CostsByCategoryChart
          costs={categoryChartRows}
          totals={categoryChartSummary.totals}
          total={categoryChartSummary.total}
          rangeStart={categoryChartSummary.range.start}
          rangeEnd={categoryChartSummary.range.end}
          presetLabel={DATE_PRESET_LABELS[filters.preset]}
          selectedCategory={filters.category}
          onSelectCategory={(category) => setFilters({ category })}
          onClearCategory={() => setFilters({ category: null })}
        />
      </div>

      <div className="mb-6">
        <CostTrendChart
          data={trend}
          rangeLabel={rangeLabel}
          groupBy={trendGroup}
          onGroupByChange={setTrendGroup}
          categories={trendCategories}
          onCategoriesChange={setTrendCategories}
        />
      </div>

      <div className="mb-6">
        <CampaignBudgetChart
          rows={campaignRows}
          sort={campaignSort}
          onSortChange={setCampaignSort}
        />
      </div>

      <CostDetailsTable
        rows={filtered}
        invoices={invoices}
        spentByCampaign={spentByCampaign}
      />
    </div>
  );
}
