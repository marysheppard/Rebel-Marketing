"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { BillingInvoiceRow } from "@/lib/billing";
import {
  downloadBillingInvoicePdf,
  type InvoicePdfContext,
} from "@/lib/billing/invoice-pdf";

function pdfContextFromRow(invoice: BillingInvoiceRow): InvoicePdfContext {
  return {
    contact_name: invoice.contact_name,
    contact_email: invoice.contact_email,
    contact_phone: invoice.contact_phone,
    contract_number: invoice.contract_number,
    contract_name: invoice.contract_name,
    payment_terms: invoice.payment_terms,
  };
}

/** Icon-only download control — sits inline beside row action text. */
export function InvoicePdfButton({
  invoice,
  context,
  className = "btn btn-ghost btn-xs btn-square shrink-0 opacity-60 hover:opacity-100",
}: {
  invoice: BillingInvoiceRow;
  context?: InvoicePdfContext;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      await downloadBillingInvoicePdf(
        invoice,
        context ?? pdfContextFromRow(invoice),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={onClick}
      title={error ?? "Save as PDF"}
      aria-label="Save as PDF"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Download className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  );
}
