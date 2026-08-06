"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import type { BillingInvoiceRow } from "@/lib/billing";
import { downloadBillingInvoicesCsv } from "@/lib/billing/invoice-csv";

/** Subtle CSV export control for a Billing invoice category. */
export function InvoiceCsvButton({
  invoices,
  filename,
  label,
  className = "btn btn-ghost btn-xs btn-square shrink-0 opacity-60 hover:opacity-100",
}: {
  invoices: BillingInvoiceRow[];
  filename: string;
  /** Used in title / aria-label */
  label: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const empty = invoices.length === 0;
  const title = error ?? (empty ? `No ${label} to export` : `Export ${label} CSV`);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (empty || busy) return;
    setBusy(true);
    setError(null);
    try {
      downloadBillingInvoicesCsv(invoices, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={className}
      disabled={busy || empty}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  );
}
