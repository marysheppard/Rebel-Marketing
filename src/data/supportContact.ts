/**
 * Canonical company contact — used on the public site, AI fallback, and emails.
 */
export const SUPPORT_CONTACT = {
  company: "Rebel Marketing",
  email: "hello@rebelmarketing.demo",
  phone: "(662) 555-0184",
  phoneHref: "tel:+16625550184",
  emailHref: "mailto:hello@rebelmarketing.demo",
  address: "100 Courthouse Square, Oxford, MS 38655",
} as const;

export function supportFallbackMessage(): string {
  return `I couldn't find information about that. Please contact support at ${SUPPORT_CONTACT.email} and our team will help you.`;
}
