"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import type { ProfitabilitySource } from "@/components/dashboards/ProfitabilityExplorer";
import {
  downloadProfitabilityExport,
  selectProfitabilityExportRows,
  type ProfitabilityExportFormat,
  type ProfitabilityExportPeriod,
  type ProfitabilityExportView,
} from "@/lib/profitability/profitability-export";

const PERIODS: { value: ProfitabilityExportPeriod; label: string }[] = [
  { value: "ytd", label: "Year to date" },
  { value: "qtd", label: "Quarter to date" },
  { value: "mtd", label: "Month to date" },
  { value: "last30", label: "Last 30 days" },
  { value: "last90", label: "Last 90 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

export function ProfitabilityExportButton({
  source,
  showAccountManagers,
  className = "btn btn-primary btn-sm gap-1",
}: {
  source: ProfitabilitySource;
  showAccountManagers: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<ProfitabilityExportPeriod>("ytd");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [clientId, setClientId] = useState("");
  const [view, setView] = useState<ProfitabilityExportView>("client");
  const [format, setFormat] = useState<ProfitabilityExportFormat>("csv");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  const clients = useMemo(
    () =>
      [...source.clients]
        .map((c) => ({ id: c.id, name: c.client_name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [source.clients],
  );

  const matchCount = useMemo(
    () =>
      selectProfitabilityExportRows(
        source,
        {
          period,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          clientId: clientId || undefined,
          view,
        },
        showAccountManagers,
      ).count,
    [source, period, dateFrom, dateTo, clientId, view, showAccountManagers],
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

  function onExport() {
    resetFeedback();
    setBusy(true);
    try {
      const result = downloadProfitabilityExport(
        source,
        {
          period,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          clientId: clientId || undefined,
          view,
        },
        format,
        showAccountManagers,
      );
      setMessage(
        result.count === 0
          ? "No rows matched — empty file downloaded."
          : `Downloaded ${result.filename} (${result.count} row${result.count === 1 ? "" : "s"}).`,
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
              Export profitability report
            </h3>
            <p className="mt-1 text-sm opacity-70">
              Filter by timeframe and client, then download CSV or PDF.
            </p>

            <label className="form-control mt-4">
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
                Timeframe
              </span>
              <select
                className="select select-bordered select-sm w-full"
                value={period}
                onChange={(e) => {
                  resetFeedback();
                  setPeriod(e.target.value as ProfitabilityExportPeriod);
                }}
              >
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            {period === "custom" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
            ) : null}

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
                disabled={view === "account_manager"}
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
                Report view
              </span>
              <select
                className="select select-bordered select-sm w-full"
                value={view}
                onChange={(e) => {
                  resetFeedback();
                  setView(e.target.value as ProfitabilityExportView);
                }}
              >
                <option value="client">By client</option>
                <option value="campaign">By campaign</option>
                {showAccountManagers ? (
                  <option value="account_manager">By account manager</option>
                ) : null}
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
              {matchCount} row{matchCount === 1 ? "" : "s"} match these filters
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
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              close
            </button>
          </form>
        </dialog>
      ) : null}
    </>
  );
}
