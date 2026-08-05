export type PeriodKey =
  | "all"
  | "mtd"
  | "last30"
  | "last90"
  | "qtd"
  | "ytd"
  | "custom";

export const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "mtd", label: "Month to date" },
  { value: "last30", label: "Last 30 days" },
  { value: "last90", label: "Last 90 days" },
  { value: "qtd", label: "Quarter to date" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function resolvePeriod(
  period: PeriodKey,
  customStart: string,
  customEnd: string,
): { start: string | null; end: string | null; label: string } {
  const now = new Date();
  const end = toDateStr(now);

  if (period === "all") {
    return { start: null, end: null, label: "All time" };
  }
  if (period === "custom") {
    return {
      start: customStart || null,
      end: customEnd || end,
      label:
        customStart && customEnd
          ? `${customStart} → ${customEnd}`
          : "Custom range",
    };
  }
  if (period === "mtd") {
    const start = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
    return { start, end, label: "Month to date" };
  }
  if (period === "last30") {
    const s = new Date(now);
    s.setDate(s.getDate() - 30);
    return { start: toDateStr(s), end, label: "Last 30 days" };
  }
  if (period === "last90") {
    const s = new Date(now);
    s.setDate(s.getDate() - 90);
    return { start: toDateStr(s), end, label: "Last 90 days" };
  }
  if (period === "qtd") {
    const q = Math.floor(now.getMonth() / 3) * 3;
    const start = toDateStr(new Date(now.getFullYear(), q, 1));
    return { start, end, label: "Quarter to date" };
  }
  const start = toDateStr(new Date(now.getFullYear(), 0, 1));
  return { start, end, label: "Year to date" };
}

export function inPeriod(
  dateStr: string | null | undefined,
  start: string | null,
  end: string | null,
) {
  if (!dateStr) return start == null && end == null;
  if (start && dateStr < start) return false;
  if (end && dateStr > end) return false;
  return true;
}

/** Inclusive range overlap for entities with start/end dates. */
export function rangesOverlap(
  entityStart: string | null | undefined,
  entityEnd: string | null | undefined,
  rangeStart: string | null,
  rangeEnd: string | null,
) {
  if (rangeStart == null && rangeEnd == null) return true;
  const eStart = entityStart || "0000-01-01";
  const eEnd = entityEnd || "9999-12-31";
  if (rangeStart && eEnd < rangeStart) return false;
  if (rangeEnd && eStart > rangeEnd) return false;
  return true;
}
