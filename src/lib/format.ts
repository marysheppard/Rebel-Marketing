export function money(value: number | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function moneyExact(value: number | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function pct(value: number | null | undefined) {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) {
    return "—";
  }
  return `${value.toFixed(1)}%`;
}

export function daysBetween(a: string | Date, b: string | Date = new Date()) {
  const start = new Date(a);
  const end = new Date(b);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function num(value: unknown) {
  return Number(value ?? 0);
}

/** Unwrap a Supabase joined relation (object or single-element array). */
export function joinField(
  rel: Record<string, unknown> | Record<string, unknown>[] | null | undefined,
  field: string,
): string {
  if (!rel) return "—";
  const obj = Array.isArray(rel) ? rel[0] : rel;
  if (!obj || typeof obj !== "object") return "—";
  const val = obj[field];
  return val != null && val !== "" ? String(val) : "—";
}

/**
 * Human-readable contract length from start/end dates.
 * Missing end, invalid range, or multi-decade spans → "Ongoing".
 */
export function contractLength(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string {
  if (!startDate) return "—";
  if (!endDate) return "Ongoing";

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "—";
  }
  if (end < start) return "Ongoing";

  const monthsApprox =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    (end.getDate() >= start.getDate() ? 0 : -1);

  if (monthsApprox >= 120) return "Ongoing";
  if (monthsApprox <= 0) {
    const days = daysBetween(start, end);
    if (days <= 0) return "Ongoing";
    if (days < 45) return "1 month";
    return "1 month";
  }

  const months = Math.max(1, Math.round(monthsApprox));
  if (months === 1) return "1 month";
  return `${months} months`;
}

/** Short locale date for table cells. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
