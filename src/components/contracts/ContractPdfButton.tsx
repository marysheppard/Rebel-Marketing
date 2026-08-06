"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  downloadContractPdf,
  type ContractPdfRow,
} from "@/lib/contracts/contract-pdf";

/** Icon-only download control — sits at the end of contract rows. */
export function ContractPdfButton({
  contract,
  className = "btn btn-ghost btn-xs btn-square shrink-0 opacity-60 hover:opacity-100",
}: {
  contract: ContractPdfRow;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      await downloadContractPdf(contract);
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
