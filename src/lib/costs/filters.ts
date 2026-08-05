import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfMonth,
  endOfQuarter,
  format,
  parseISO,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subMonths,
  subYears,
} from "date-fns";
import { COST_CATEGORIES, type CostCategory } from "./categories";

export type DatePreset =
  | "current_month"
  | "previous_month"
  | "current_quarter"
  | "ytd"
  | "last_12_months"
  | "last_24_months"
  | "all_time"
  | "custom";

export type ApprovalFilter = "all" | "approved" | "pending";
export type PassThroughFilter = "all" | "yes" | "no";
export type BillingFilter =
  | "all"
  | "awaiting_approval"
  | "ready_to_bill"
  | "draft_invoice"
  | "invoiced"
  | "paid"
  | "not_billable";

export type CostFilterState = {
  preset: DatePreset;
  startDate: string | null;
  endDate: string | null;
  clientId: string | null;
  campaignId: string | null;
  category: CostCategory | null;
  approval: ApprovalFilter;
  passThrough: PassThroughFilter;
  billing: BillingFilter;
  search: string;
};

export const DEFAULT_FILTERS: CostFilterState = {
  preset: "last_24_months",
  startDate: null,
  endDate: null,
  clientId: null,
  campaignId: null,
  category: null,
  approval: "all",
  passThrough: "all",
  billing: "all",
  search: "",
};

export type DateRangeOptions = {
  /** Earliest cost_date in the dataset — used by the all_time preset. */
  earliestCostDate?: string | null;
};

export function resolveDateRange(
  filters: Pick<CostFilterState, "preset" | "startDate" | "endDate">,
  asOf: Date = new Date(),
  options: DateRangeOptions = {},
): { start: string; end: string } {
  const endOfToday = format(asOf, "yyyy-MM-dd");

  switch (filters.preset) {
    case "current_month":
      return {
        start: format(startOfMonth(asOf), "yyyy-MM-dd"),
        end: format(endOfMonth(asOf), "yyyy-MM-dd"),
      };
    case "previous_month": {
      const prev = subMonths(asOf, 1);
      return {
        start: format(startOfMonth(prev), "yyyy-MM-dd"),
        end: format(endOfMonth(prev), "yyyy-MM-dd"),
      };
    }
    case "current_quarter":
      return {
        start: format(startOfQuarter(asOf), "yyyy-MM-dd"),
        end: format(endOfQuarter(asOf), "yyyy-MM-dd"),
      };
    case "ytd":
      return {
        start: format(startOfYear(asOf), "yyyy-MM-dd"),
        end: endOfToday,
      };
    case "custom": {
      let start = filters.startDate ?? endOfToday;
      let end = filters.endDate ?? endOfToday;
      if (start > end) {
        const tmp = start;
        start = end;
        end = tmp;
      }
      return { start, end };
    }
    case "last_12_months": {
      const start = format(addDays(subMonths(asOf, 12), 1), "yyyy-MM-dd");
      return { start, end: endOfToday };
    }
    case "all_time": {
      const earliest = options.earliestCostDate;
      const fallback = format(subYears(asOf, 5), "yyyy-MM-dd");
      const start =
        earliest && earliest <= endOfToday ? earliest : fallback;
      return { start, end: endOfToday };
    }
    case "last_24_months":
    default: {
      const start = format(addDays(subMonths(asOf, 24), 1), "yyyy-MM-dd");
      return { start, end: endOfToday };
    }
  }
}

/** Previous equal-length window immediately before the current range. */
export function previousPeriodRange(start: string, end: string): {
  start: string;
  end: string;
} {
  const s = parseISO(start);
  const e = parseISO(end);
  const days = Math.max(0, differenceInCalendarDays(e, s));
  const prevEnd = addDays(s, -1);
  const prevStart = addDays(prevEnd, -days);
  return {
    start: format(prevStart, "yyyy-MM-dd"),
    end: format(prevEnd, "yyyy-MM-dd"),
  };
}

export type TrendGranularity =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

/** User-selectable trend grouping on the Cost Trend chart. */
export type TrendGroupBy = "month" | "quarter" | "year";

export const TREND_GROUP_TO_GRANULARITY: Record<TrendGroupBy, TrendGranularity> =
  {
    month: "monthly",
    quarter: "quarterly",
    year: "yearly",
  };

export const TREND_GROUP_LABELS: Record<TrendGroupBy, string> = {
  month: "Month",
  quarter: "Quarter",
  year: "Year",
};

export const DEFAULT_TREND_GROUP: TrendGroupBy = "month";

/** Categories visible on the Cost Trend chart (independent of dashboard category filter). */
export type TrendCategorySelection = CostCategory[];

export const DEFAULT_TREND_CATEGORIES: TrendCategorySelection = [
  ...COST_CATEGORIES,
];

export function parseTrendCategories(
  raw: string | null,
): TrendCategorySelection {
  if (!raw || raw === "all") return [...DEFAULT_TREND_CATEGORIES];
  const selected = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is CostCategory =>
      (COST_CATEGORIES as readonly string[]).includes(s),
    );
  // De-dupe while preserving category order
  return COST_CATEGORIES.filter((cat) => selected.includes(cat));
}

export function serializeTrendCategories(
  categories: TrendCategorySelection,
): string | null {
  if (
    categories.length === COST_CATEGORIES.length &&
    COST_CATEGORIES.every((cat) => categories.includes(cat))
  ) {
    return null; // default = all, omit from URL
  }
  if (categories.length === 0) return "none";
  return categories.join(",");
}

export function trendGranularity(start: string, end: string): TrendGranularity {
  const days = differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
  if (days <= 31) return "daily";
  if (days <= 120) return "weekly";
  if (days <= 400) return "monthly";
  return "quarterly";
}

export function inDateRange(
  costDate: string | null | undefined,
  start: string,
  end: string,
): boolean {
  if (!costDate) return false;
  return costDate >= start && costDate <= end;
}

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  current_month: "Current month",
  previous_month: "Previous month",
  current_quarter: "Current quarter",
  ytd: "Year to date",
  last_12_months: "Last 12 months",
  last_24_months: "Last 24 months",
  all_time: "All time",
  custom: "Custom range",
};

export function periodKeyAndLabel(
  dateStr: string,
  granularity: TrendGranularity,
): { key: string; label: string } {
  const d = parseISO(dateStr);
  if (granularity === "daily") {
    return { key: dateStr, label: format(d, "MMM d") };
  }
  if (granularity === "weekly") {
    const weekStart = startOfWeek(d, { weekStartsOn: 1 });
    return {
      key: format(weekStart, "yyyy-MM-dd"),
      label: `W/o ${format(weekStart, "MMM d")}`,
    };
  }
  if (granularity === "quarterly") {
    const qStart = startOfQuarter(d);
    const q = Math.floor(qStart.getMonth() / 3) + 1;
    return {
      key: `${format(qStart, "yyyy")}-Q${q}`,
      label: `Q${q} ${format(qStart, "yyyy")}`,
    };
  }
  if (granularity === "yearly") {
    return {
      key: format(d, "yyyy"),
      label: format(d, "yyyy"),
    };
  }
  return {
    key: format(d, "yyyy-MM"),
    label: format(d, "MMM yy"),
  };
}

/** Build every period bucket between start and end (inclusive), for continuous trends. */
export function enumerateTrendPeriods(
  start: string,
  end: string,
  granularity: TrendGranularity,
): { key: string; label: string }[] {
  const periods: { key: string; label: string }[] = [];
  const seen = new Set<string>();

  let cursor = parseISO(start);
  const endDate = parseISO(end);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(endDate.getTime())) {
    return periods;
  }

  // Safety cap to avoid runaway loops on bad ranges
  for (let i = 0; i < 500; i++) {
    if (cursor > endDate) break;
    const dateStr = format(cursor, "yyyy-MM-dd");
    const { key, label } = periodKeyAndLabel(dateStr, granularity);
    if (!seen.has(key)) {
      seen.add(key);
      periods.push({ key, label });
    }

    if (granularity === "daily") {
      cursor = addDays(cursor, 1);
    } else if (granularity === "weekly") {
      cursor = addWeeks(startOfWeek(cursor, { weekStartsOn: 1 }), 1);
    } else if (granularity === "quarterly") {
      cursor = addMonths(startOfQuarter(cursor), 3);
    } else if (granularity === "yearly") {
      cursor = addMonths(startOfYear(cursor), 12);
    } else {
      cursor = addMonths(startOfMonth(cursor), 1);
    }
  }

  return periods;
}
