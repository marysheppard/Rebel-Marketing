"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import type { BillingInvoiceRow } from "@/lib/billing";
import {
  downloadFilteredBillingExport,
  filterBillingInvoices,
  type BillingExportFormat,
  type BillingExportScope,
} from "@/lib/billing/billing-export";

const SCOPES: { value: BillingExportScope; label: string }[] = [
  { value: "all", label: "All invoices" },
  { value: "drafts", label: "Drafts" },
  { value: "active", label: "Recently sent / active" },
  { value: "history", label: "Paid / History" },
];

export function BillingExportButton({
  invoices,
  className = "btn btn-primary btn-sm gap-1",
}: {
  invoices: BillingInvoiceRow[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [clientId, setClientId] = useState("");
  const [scope, setScope] = useState<BillingExportScope>("all");
  const [format, setFormat] = useState<BillingExportFormat>("csv");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  const clients = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of invoices) {
      if (i.client_id) map.set(i.client_id, i.client_name || "—");
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [invoices]);

  const matchCount = useMemo(
    () =>
      filterBillingInvoices(invoices, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        clientId: clientId || undefined,
        scope,
      }).length,
    [invoices, dateFrom, dateTo, clientId, scope],
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function resetFeedback() {
    setMessage(null);
    setError(null);
  }

  async function onExport() {
    resetFeedback();
    setBusy(true);
    try {
      const result = await downloadFilteredBillingExport(
        invoices,
        {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          clientId: clientId || undefined,
          scope,
        },
        format,
      );
      setMessage(
        result.count === 0
          ? "No invoices matched — empty file downloaded."
          : `Downloaded ${result.filename} (${result.count} invoice${result.count === 1 ? "" : "s"}).`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <Download className="h-4 w-4" aria-hidden />
        Export
      </button>

      {open ? (
        <dialog className="modal modal-open" aria-labelledby={titleId}>
          <div className="modal-box max-w-lg">
            <h3 id={titleId} className="text-lg font-bold">
              Export invoices
            </h3>
            <p className="mt-1 text-sm opacity-70">
              Filter by timeframe and client, then download CSV or PDF.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
                  From
                </span>
                <input
                  type="date"
                  className="input input-bordered input-sm w-full"
                  value={dateFrom}
                  onChange={(e) => {
                    resetFeedback();
                    setDateFrom(e.target.value);
                  }}
                />
              </label>
              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
                  To
                </span>
                <input
                  type="date"
                  className="input input-bordered input-sm w-full"
                  value={dateTo}
                  onChange={(e) => {
                    resetFeedback();
                    setDateTo(e.target.value);
                  }}
                />
              </label>
            </div>

            <label className="form-control mt-3">
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
                Client
              </span>
              <select
                className="select select-bordered select-sm w-full"
                value={clientId}
                onChange={(e) => {
                  resetFeedback();
                  setClientId(e.target.value);
                }}
              >
                <option value="">All clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control mt-3">
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
                Category
              </span>
              <select
                className="select select-bordered select-sm w-full"
                value={scope}
                onChange={(e) => {
                  resetFeedback();
                  setScope(e.target.value as BillingExportScope);
                }}
              >
                {SCOPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-3">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide opacity-60">
                Format
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`btn btn-sm gap-1 ${format === "csv" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => {
                    resetFeedback();
                    setFormat("csv");
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4" aria-hidden />
                  CSV
                </button>
                <button
                  type="button"
                  className={`btn btn-sm gap-1 ${format === "pdf" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => {
                    resetFeedback();
                    setFormat("pdf");
                  }}
                >
                  <FileText className="h-4 w-4" aria-hidden />
                  PDF
                </button>
              </div>
            </div>

            <p className="mt-3 text-sm opacity-70">
              {matchCount} invoice{matchCount === 1 ? "" : "s"} match these
              filters
            </p>

            {message ? (
              <p className="mt-2 text-sm text-success">{message}</p>
            ) : null}
            {error ? (
              <p className="mt-2 text-sm text-error">{error}</p>
            ) : null}

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm gap-1"
                onClick={onExport}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="h-4 w-4" aria-hidden />
                )}
                {busy ? "Exporting…" : "Generate export"}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="button" aria-label="Close" onClick={() => setOpen(false)}>
              close
            </button>
          </form>
        </dialog>
      ) : null}
    </>
  );
}
