import type { SupabaseClient } from "@supabase/supabase-js";

export type ApplyPaymentInput = {
  invoiceId: string;
  clientId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  /** Remaining balance before applying this payment. */
  remainingBefore: number;
  reference?: string;
  notes?: string;
};

export type ApplyPaymentResult =
  | { ok: true; newStatus: string; remaining: number }
  | { ok: false; error: string };

/** Invoice status after a payment based on remaining balance. */
export function invoiceStatusAfterPayment(remainingAfter: number): string {
  return remainingAfter <= 0 ? "Paid" : "Partially Paid";
}

/**
 * Insert a payment and update invoice status to Paid or Partially Paid.
 * Caller must enforce auth / ownership; this only performs the writes.
 */
export async function applyPayment(
  supabase: SupabaseClient,
  input: ApplyPaymentInput,
): Promise<ApplyPaymentResult> {
  const amount = Number(input.amount);
  const remainingBefore = Number(input.remainingBefore);

  if (!(amount > 0)) {
    return { ok: false, error: "Payment amount must be greater than zero." };
  }
  if (amount > remainingBefore + 1e-9) {
    return {
      ok: false,
      error: `Payment cannot exceed remaining balance of $${remainingBefore.toFixed(2)}.`,
    };
  }

  const { error: payError } = await supabase.from("payments").insert({
    invoice_id: input.invoiceId,
    client_id: input.clientId,
    payment_date: input.paymentDate,
    amount,
    payment_method: input.paymentMethod,
    reference: (input.reference ?? "").trim(),
    notes: (input.notes ?? "").trim(),
  });

  if (payError) {
    return {
      ok: false,
      error: payError.message
        ? `Could not record payment: ${payError.message}`
        : "Could not record payment.",
    };
  }

  const remaining = Math.max(0, remainingBefore - amount);
  const newStatus = invoiceStatusAfterPayment(remaining);

  const { data: updated, error: invError } = await supabase
    .from("invoices")
    .update({ status: newStatus })
    .eq("id", input.invoiceId)
    .select("id, status")
    .maybeSingle();

  if (invError) {
    return {
      ok: false,
      error: invError.message
        ? `Payment saved, but invoice status could not be updated: ${invError.message}`
        : "Payment saved, but invoice status could not be updated.",
    };
  }

  if (!updated || updated.status !== newStatus) {
    return {
      ok: false,
      error:
        "Payment saved, but invoice status did not change. Please contact support.",
    };
  }

  return { ok: true, newStatus, remaining };
}
