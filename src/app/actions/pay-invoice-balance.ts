"use server";

import { revalidatePath } from "next/cache";
import { applyPayment } from "@/lib/billing/apply-payment";
import { remainingBalance } from "@/lib/finance";
import { isClientRole } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Invoice } from "@/lib/types";

export type PayInvoiceBalanceResult =
  | { ok: true; newStatus: string; remaining: number }
  | { ok: false; error: string };

const NON_PAYABLE_STATUSES = new Set(["Draft", "Canceled", "Paid"]);

/**
 * Client portal demo pay: apply a full or partial amount toward one open invoice.
 * Writes via service role after ownership checks (clients do not insert payments).
 */
export async function payInvoiceBalance(
  invoiceId: string,
  amount: number,
): Promise<PayInvoiceBalanceResult> {
  const id = String(invoiceId ?? "").trim();
  if (!id) return { ok: false, error: "Invoice is required." };

  const payAmount = Number(amount);
  if (!(payAmount > 0)) {
    return { ok: false, error: "Payment amount must be greater than zero." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !isClientRole(profile.role)) {
    return { ok: false, error: "Only client portal users can pay invoices here." };
  }

  const { data: link } = await supabase
    .from("client_user_links")
    .select("client_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!link?.client_id) {
    return { ok: false, error: "No client account is linked to this user." };
  }

  const { data: invoiceRow, error: invLoadError } = await supabase
    .from("invoices")
    .select("*, payments(amount)")
    .eq("id", id)
    .maybeSingle();

  if (invLoadError || !invoiceRow) {
    return { ok: false, error: "Invoice not found." };
  }

  const invoice = invoiceRow as Invoice;

  if (invoice.client_id !== link.client_id) {
    return { ok: false, error: "You do not have access to this invoice." };
  }

  if (invoice.disputed) {
    return {
      ok: false,
      error: "This invoice is disputed and cannot be paid online.",
    };
  }

  if (NON_PAYABLE_STATUSES.has(invoice.status)) {
    return { ok: false, error: "This invoice is not payable." };
  }

  const remaining = remainingBalance(invoice);
  if (remaining <= 0) {
    return { ok: false, error: "This invoice has no remaining balance." };
  }

  if (payAmount > remaining + 1e-9) {
    return {
      ok: false,
      error: `Payment cannot exceed remaining balance of $${remaining.toFixed(2)}.`,
    };
  }

  const writer = createAdminClient();
  if (!writer) {
    return {
      ok: false,
      error:
        "Payment processing is unavailable (server admin not configured). Contact support.",
    };
  }

  const isFull = payAmount >= remaining - 1e-9;
  const result = await applyPayment(writer, {
    invoiceId: invoice.id,
    clientId: invoice.client_id,
    amount: payAmount,
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "Demo Card",
    reference: `demo_${invoice.id}_${Date.now()}`,
    notes: isFull
      ? "Client portal demo payment (full remaining balance)."
      : "Client portal demo payment (partial).",
    remainingBefore: remaining,
  });

  if (!result.ok) return result;

  revalidatePath("/app");
  return result;
}

export type PayAccountBalanceResult =
  | {
      ok: true;
      amountApplied: number;
      invoicesPaid: number;
      accountRemaining: number;
    }
  | { ok: false; error: string };

/**
 * Client portal demo pay toward total open balance.
 * Applies amount oldest-due-first across payable (non-disputed) invoices.
 */
export async function payAccountBalance(
  amount: number,
): Promise<PayAccountBalanceResult> {
  const payAmount = Number(amount);
  if (!(payAmount > 0)) {
    return { ok: false, error: "Payment amount must be greater than zero." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !isClientRole(profile.role)) {
    return { ok: false, error: "Only client portal users can pay invoices here." };
  }

  const { data: link } = await supabase
    .from("client_user_links")
    .select("client_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!link?.client_id) {
    return { ok: false, error: "No client account is linked to this user." };
  }

  const writer = createAdminClient();
  if (!writer) {
    return {
      ok: false,
      error:
        "Payment processing is unavailable (server admin not configured). Contact support.",
    };
  }

  const { data: invoiceRows, error: invLoadError } = await supabase
    .from("invoices")
    .select("*, payments(amount)")
    .eq("client_id", link.client_id)
    .order("due_date", { ascending: true });

  if (invLoadError) {
    return { ok: false, error: "Could not load open invoices." };
  }

  const payable = ((invoiceRows ?? []) as Invoice[])
    .filter((inv) => {
      if (inv.disputed) return false;
      if (NON_PAYABLE_STATUSES.has(inv.status)) return false;
      return remainingBalance(inv) > 0;
    })
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const accountRemaining = payable.reduce(
    (sum, inv) => sum + remainingBalance(inv),
    0,
  );

  if (accountRemaining <= 0) {
    return { ok: false, error: "Your account has no remaining balance." };
  }

  if (payAmount > accountRemaining + 1e-9) {
    return {
      ok: false,
      error: `Payment cannot exceed account balance of $${accountRemaining.toFixed(2)}.`,
    };
  }

  let left = payAmount;
  let invoicesPaid = 0;
  const paymentDate = new Date().toISOString().slice(0, 10);
  const batchId = Date.now();

  for (const inv of payable) {
    if (left <= 1e-9) break;
    const remaining = remainingBalance(inv);
    if (remaining <= 0) continue;

    const slice = Math.min(left, remaining);
    const isFull = slice >= remaining - 1e-9;
    const result = await applyPayment(writer, {
      invoiceId: inv.id,
      clientId: inv.client_id,
      amount: slice,
      paymentDate,
      paymentMethod: "Demo Card",
      reference: `demo_acct_${inv.id}_${batchId}`,
      notes: isFull
        ? "Client portal demo account payment (applied to invoice)."
        : "Client portal demo account payment (partial on invoice).",
      remainingBefore: remaining,
    });

    if (!result.ok) {
      return {
        ok: false,
        error:
          invoicesPaid > 0
            ? `Partially applied then failed: ${result.error}`
            : result.error,
      };
    }

    // Keep in-memory remaining accurate for subsequent accountRemaining calc
    inv.payments = [...(inv.payments ?? []), { amount: slice }];
    left -= slice;
    invoicesPaid += 1;
  }

  const amountApplied = payAmount - Math.max(0, left);
  const accountRemainingAfter = payable.reduce(
    (sum, inv) => sum + remainingBalance(inv),
    0,
  );

  revalidatePath("/app");
  return {
    ok: true,
    amountApplied,
    invoicesPaid,
    accountRemaining: accountRemainingAfter,
  };
}
