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
export function joinOne<T extends Record<string, unknown>>(
  rel: T | T[] | null | undefined,
): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

/** Unwrap a Supabase joined relation field (object or single-element array). */
export function joinField(
  rel: Record<string, unknown> | Record<string, unknown>[] | null | undefined,
  field: string,
): string {
  if (!rel) return "—";
  const obj = joinOne(rel);
  if (!obj) return "—";
  const val = obj[field];
  return val != null && val !== "" ? String(val) : "—";
}
