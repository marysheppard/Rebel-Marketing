/** Shared display/input formatting for phone, email, and US addresses. */

export type AddressParts = {
  street_address?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
};

/** Digits only; strips a leading US country code `1` when present. */
export function phoneDigits(value: string | null | undefined): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

/** Live input mask: `(XXX) XXX-XXXX` (up to 10 digits). */
export function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Display phone as `(XXX) XXX-XXXX` when 10 US digits are present.
 * Empty → "—"; otherwise returns the trimmed original.
 */
export function formatPhone(value: string | null | undefined): string {
  if (value == null || !String(value).trim()) return "—";
  const digits = phoneDigits(value);
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return String(value).trim();
}

/** `tel:+1XXXXXXXXXX` when a valid 10-digit US number is present. */
export function telHref(value: string | null | undefined): string | null {
  const digits = phoneDigits(value);
  if (digits.length !== 10) return null;
  return `tel:+1${digits}`;
}

/** Trimmed, lowercased email; empty → "—". */
export function formatEmail(value: string | null | undefined): string {
  if (value == null || !String(value).trim()) return "—";
  return String(value).trim().toLowerCase();
}

/** `mailto:` href when a non-empty email is present. */
export function mailtoHref(value: string | null | undefined): string | null {
  const email = formatEmail(value);
  if (email === "—") return null;
  return `mailto:${email}`;
}

/** US city line: `Oxford, MS 38655` (no comma before ZIP). */
export function formatCityStateZip(
  city?: string | null,
  state?: string | null,
  zip?: string | null,
): string {
  const cityState = [city?.trim(), state?.trim()].filter(Boolean).join(", ");
  const zipCode = zip?.trim() ?? "";
  if (cityState && zipCode) return `${cityState} ${zipCode}`;
  return cityState || zipCode;
}

/**
 * Format a street address.
 * - `inline`: comma-separated single line
 * - `multiline`: newline-separated (PDF / letter blocks)
 * Empty → "—"
 */
export function formatAddress(
  parts: AddressParts,
  mode: "inline" | "multiline" = "inline",
): string {
  const line1 = parts.street_address?.trim() ?? "";
  const line2 = parts.address_line_2?.trim() ?? "";
  const cityLine = formatCityStateZip(parts.city, parts.state, parts.zip_code);
  const lines = [line1, line2, cityLine].filter(Boolean);
  if (!lines.length) return "—";
  return mode === "multiline" ? lines.join("\n") : lines.join(", ");
}
