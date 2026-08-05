import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfYear,
  subMonths,
} from "date-fns";

export const AR_AGING_BUCKETS = [
  "Current",
  "1–30",
  "31–60",
  "61–90",
  "90+",
] as const;

export type ArAgingBucket = (typeof AR_AGING_BUCKETS)[number];

export type ArDatePreset =
  | "current_month"
  | "previous_month"
  | "ytd"
  | "last_12_months"
  | "last_24_months"
  | "all_time"
  | "custom";

export type ArDisputeFilter = "all" | "disputed" | "not_disputed";

export type ArInvoiceStatusFilter =
  | "all"
  | "Draft"
  | "Sent"
  | "Partially Paid"
  | "Paid"
  | "Overdue"
  | "Disputed"
  | "Canceled";

export type ArFilterState = {
  preset: ArDatePreset;
  startDate: string | null;
  endDate: string | null;
  clientId: string | null;
  status: ArInvoiceStatusFilter;
  aging: ArAgingBucket | null;
  dispute: ArDisputeFilter;
  accountManagerId: string | null;
  search: string;
};

export const DEFAULT_AR_FILTERS: ArFilterState = {
  preset: "last_12_months",
  startDate: null,
  endDate: null,
  clientId: null,
  status: "all",
  aging: null,
  dispute: "all",
  accountManagerId: null,
  search: "",
};

export const AR_DATE_PRESET_LABELS: Record<ArDatePreset, string> = {
  current_month: "Current month",
  previous_month: "Previous month",
  ytd: "Year to date",
  last_12_months: "Last 12 months",
  last_24_months: "Last 24 months",
  all_time: "All time",
  custom: "Custom range",
};

export function resolveArDateRange(
  filters: Pick<ArFilterState, "preset" | "startDate" | "endDate">,
  asOf: Date = new Date(),
  earliestInvoiceDate?: string | null,
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
    case "ytd":
      return {
        start: format(startOfYear(asOf), "yyyy-MM-dd"),
        end: endOfToday,
      };
    case "last_12_months":
      return {
        start: format(subMonths(asOf, 12), "yyyy-MM-dd"),
        end: endOfToday,
      };
    case "last_24_months":
      return {
        start: format(subMonths(asOf, 24), "yyyy-MM-dd"),
        end: endOfToday,
      };
    case "all_time":
      return {
        start: earliestInvoiceDate ?? "2000-01-01",
        end: endOfToday,
      };
    case "custom":
      return {
        start: filters.startDate ?? earliestInvoiceDate ?? "2000-01-01",
        end: filters.endDate ?? endOfToday,
      };
    default:
      return {
        start: format(subMonths(asOf, 12), "yyyy-MM-dd"),
        end: endOfToday,
      };
  }
}

export function previousArPeriodRange(
  start: string,
  end: string,
): { start: string; end: string } {
  const s = parseISO(start);
  const e = parseISO(end);
  const days = differenceInCalendarDays(e, s) + 1;
  const prevEnd = new Date(s);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (days - 1));
  return {
    start: format(prevStart, "yyyy-MM-dd"),
    end: format(prevEnd, "yyyy-MM-dd"),
  };
}

export function inDateRange(
  date: string | null | undefined,
  start: string,
  end: string,
): boolean {
  if (!date) return false;
  return date >= start && date <= end;
}

/** User-selectable trend grouping on the AR Trend chart. */
export type ArTrendGroupBy = "month" | "quarter" | "year";

export const AR_TREND_GROUP_LABELS: Record<ArTrendGroupBy, string> = {
  month: "Month",
  quarter: "Quarter",
  year: "Year",
};

export const DEFAULT_AR_TREND_GROUP: ArTrendGroupBy = "month";

export type ArTrendSeriesKey =
  | "openAr"
  | "overdueAr"
  | "cashCollected"
  | "newInvoices";

export const AR_TREND_SERIES: ArTrendSeriesKey[] = [
  "openAr",
  "overdueAr",
  "cashCollected",
  "newInvoices",
];

export const AR_TREND_SERIES_LABELS: Record<ArTrendSeriesKey, string> = {
  openAr: "Open AR",
  overdueAr: "Overdue AR",
  cashCollected: "Cash Collected",
  newInvoices: "New Invoices",
};

export const AR_TREND_SERIES_COLORS: Record<ArTrendSeriesKey, string> = {
  openAr: "oklch(65% 0.14 250)",
  overdueAr: "oklch(60% 0.16 25)",
  cashCollected: "oklch(68% 0.12 160)",
  newInvoices: "oklch(70% 0.12 85)",
};

export type ArTrendSeriesSelection = ArTrendSeriesKey[];

export const DEFAULT_AR_TREND_SERIES: ArTrendSeriesSelection = [
  ...AR_TREND_SERIES,
];

export function parseArTrendSeries(
  raw: string | null,
): ArTrendSeriesSelection {
  if (!raw || raw === "all") return [...DEFAULT_AR_TREND_SERIES];
  if (raw === "none") return [];
  const selected = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is ArTrendSeriesKey =>
      (AR_TREND_SERIES as readonly string[]).includes(s),
    );
  return AR_TREND_SERIES.filter((key) => selected.includes(key));
}

export function serializeArTrendSeries(
  series: ArTrendSeriesSelection,
): string | null {
  if (
    series.length === AR_TREND_SERIES.length &&
    AR_TREND_SERIES.every((key) => series.includes(key))
  ) {
    return null;
  }
  if (series.length === 0) return "none";
  return series.join(",");
}
