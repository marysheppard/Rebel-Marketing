"use client";

import { useEffect, useId, useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import type { TableExportFormat } from "@/lib/exports/table-export";

/** Shared export dialog shell used across Campaigns / Employees / Time & PTO. */
export function ExportDialogShell({
  open,
  onClose,
  title,
  description,
  matchCount,
  matchLabel = "rows",
  format,
  onFormatChange,
  busy,
  message,
  error,
  onExport,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  matchCount: number;
  matchLabel?: string;
  format: TableExportFormat;
  onFormatChange: (f: TableExportFormat) => void;
  busy: boolean;
  message: string | null;
  error: string | null;
  onExport: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <dialog className="modal modal-open" aria-labelledby={titleId}>
      <div className="modal-box max-w-lg">
        <h3 id={titleId} className="text-lg font-bold">
          {title}
        </h3>
        <p className="mt-1 text-sm opacity-70">{description}</p>

        <div className="mt-4 space-y-3">{children}</div>

        <div className="mt-3">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide opacity-60">
            Format
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`btn btn-sm gap-1 ${format === "csv" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => onFormatChange("csv")}
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
              CSV
            </button>
            <button
              type="button"
              className={`btn btn-sm gap-1 ${format === "pdf" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => onFormatChange("pdf")}
            >
              <FileText className="h-4 w-4" aria-hidden />
              PDF
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm opacity-70">
          {matchCount} {matchLabel} match these filters
        </p>
        {message ? <p className="mt-2 text-sm text-success">{message}</p> : null}
        {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}

        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
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
        <button type="button" aria-label="Close" onClick={onClose}>
          close
        </button>
      </form>
    </dialog>
  );
}

export function ExportTriggerButton({
  onClick,
  className = "btn btn-primary btn-sm gap-1",
  label = "Export",
}: {
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <button type="button" className={className} onClick={onClick}>
      <Download className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

export function useExportDialogState() {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<TableExportFormat>("csv");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetFeedback() {
    setMessage(null);
    setError(null);
  }

  return {
    open,
    setOpen,
    format,
    setFormat,
    busy,
    setBusy,
    message,
    setMessage,
    error,
    setError,
    resetFeedback,
  };
}
