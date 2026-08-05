import { PERIOD_OPTIONS, type PeriodKey } from "@/lib/period";

const VALID = new Set(PERIOD_OPTIONS.map((o) => o.value));

export function parsePeriodParam(
  value: string | null | undefined,
  fallback: PeriodKey = "ytd",
): PeriodKey {
  if (value && VALID.has(value as PeriodKey)) return value as PeriodKey;
  return fallback;
}

export function withPeriod(href: string, period: PeriodKey) {
  if (period === "ytd") return href;
  const join = href.includes("?") ? "&" : "?";
  return `${href}${join}period=${period}`;
}
