import { money, num } from "@/lib/format";
import { suggestedInvoiceSubtotal } from "@/lib/finance";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = { from: (table: string) => any };

/** Notify all billing-role users (in-app bell). */
export async function notifyBillingStaff(
  supabase: AnySupabase,
  input: {
    title: string;
    body: string;
    href: string;
  },
) {
  const { data: staff } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "billing");

  const rows = (staff ?? []).map((s: { id: string }) => ({
    user_id: s.id,
    title: input.title,
    body: input.body,
    href: input.href,
  }));

  if (rows.length > 0) {
    await supabase.from("notifications").insert(rows);
  }

  return { ok: true as const, notified: rows.length };
}

/** After engagement/campaign + optional opening draft invoice. */
export async function notifyBillingAfterEngagement(
  supabase: AnySupabase,
  input: {
    contractId: string;
    contractName: string;
    contractNumber: string;
    invoiceId: string | null;
    billAmount: number;
  },
) {
  const href = input.invoiceId
    ? `/app/billing/review?invoice=${input.invoiceId}`
    : "/app/billing";
  const amountLabel =
    input.billAmount > 0
      ? ` Suggested amount: ${money(input.billAmount)}.`
      : "";
  return notifyBillingStaff(supabase, {
    title: "Opening invoice ready to review",
    body: `${input.contractName} (${input.contractNumber}) is fully executed.${amountLabel} Review and send when ready.`,
    href,
  });
}

/** When billable work is approved for invoicing. */
export async function notifyBillingAfterWorkApproved(
  supabase: AnySupabase,
  input: {
    clientName: string;
    campaignName: string;
    hours: number;
    estimatedAmount: number;
  },
) {
  return notifyBillingStaff(supabase, {
    title: "Work ready to invoice",
    body: `${input.clientName} · ${input.campaignName}: ${num(input.hours).toFixed(1)}h approved (~${money(input.estimatedAmount)}).`,
    href: "/app/billing",
  });
}

export function openingBillAmount(contract: {
  billing_method?: string | null;
  monthly_retainer?: number | string | null;
  project_fee?: number | string | null;
  deposit_amount?: number | string | null;
}) {
  const deposit = num(contract.deposit_amount);
  if (deposit > 0) return deposit;
  return suggestedInvoiceSubtotal(contract);
}
