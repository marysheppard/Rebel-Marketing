"use client";

import { useMemo, useState } from "react";
import {
  ExportDialogShell,
  ExportTriggerButton,
  useExportDialogState,
} from "@/components/exports/ExportDialogShell";
import {
  downloadTableExport,
  type TableExportFormat,
} from "@/lib/exports/table-export";

export type ListExportRow = Record<string, string | number | boolean | null | undefined>;

export type ListExportFilterConfig = {
  /** Field holding client id for filtering */
  clientKey?: string;
  clients?: { id: string; name: string }[];
  /** Field holding status for filtering */
  statusKey?: string;
  statuses?: string[];
  statusLabel?: string;
  /** Field holding type/category for filtering */
  typeKey?: string;
  types?: string[];
  typeLabel?: string;
  /** Field holding YYYY-MM-DD (or ISO) date for range filter */
  dateKey?: string;
  showDates?: boolean;
};

function inDate(date: string | undefined | null, from?: string, to?: string) {
  if (!from && !to) return true;
  if (!date) return false;
  const day = date.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function cellValue(v: string | number | boolean | null | undefined): string {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

/**
 * Header Export for tabular pages (CSV / PDF).
 * Only accepts serializable props — safe from Server Components.
 */
export function ListExportButton({
  title,
  description,
  filenameBase,
  headers,
  items,
  filterConfig,
  className = "btn btn-outline btn-sm gap-1",
  matchLabel = "rows",
}: {
  title: string;
  description: string;
  filenameBase: string;
  /** Column headers; values are read from items[header] */
  headers: string[];
  items: ListExportRow[];
  filterConfig?: ListExportFilterConfig;
  className?: string;
  matchLabel?: string;
}) {
  const dlg = useExportDialogState();
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const cfg = filterConfig ?? {};

  const filtered = useMemo(() => {
    return items.filter((row) => {
      if (cfg.clientKey && clientId) {
        if (String(row[cfg.clientKey] ?? "") !== clientId) return false;
      }
      if (cfg.statusKey && status) {
        if (String(row[cfg.statusKey] ?? "") !== status) return false;
      }
      if (cfg.typeKey && type) {
        if (String(row[cfg.typeKey] ?? "") !== type) return false;
      }
      if (cfg.showDates !== false && cfg.dateKey && (dateFrom || dateTo)) {
        const raw = row[cfg.dateKey];
        if (!inDate(raw == null ? null : String(raw), dateFrom || undefined, dateTo || undefined)) {
          return false;
        }
      }
      return true;
    });
  }, [items, cfg.clientKey, cfg.statusKey, cfg.typeKey, cfg.dateKey, cfg.showDates, clientId, status, type, dateFrom, dateTo]);

  function onExport() {
    dlg.resetFeedback();
    dlg.setBusy(true);
    try {
      const rows = filtered.map((row) => {
        const out: Record<string, unknown> = {};
        for (const h of headers) {
          out[h] = cellValue(row[h]);
        }
        return out;
      });
      const result = downloadTableExport(
        title,
        headers,
        rows,
        filenameBase,
        dlg.format as TableExportFormat,
      );
      dlg.setMessage(
        result.count === 0
          ? "No rows matched — empty file downloaded."
          : `Downloaded ${result.filename} (${result.count} ${matchLabel}).`,
      );
    } catch (e) {
      dlg.setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      dlg.setBusy(false);
    }
  }

  return (
    <>
      <ExportTriggerButton
        className={className}
        onClick={() => dlg.setOpen(true)}
      />
      <ExportDialogShell
        open={dlg.open}
        onClose={() => dlg.setOpen(false)}
        title={title}
        description={description}
        matchCount={filtered.length}
        matchLabel={matchLabel}
        format={dlg.format}
        onFormatChange={(f) => {
          dlg.resetFeedback();
          dlg.setFormat(f);
        }}
        busy={dlg.busy}
        message={dlg.message}
        error={dlg.error}
        onExport={onExport}
      >
        {cfg.clients && cfg.clients.length > 0 ? (
          <label className="form-control">
            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
              Client
            </span>
            <select
              className="select select-bordered select-sm w-full"
              value={clientId}
              onChange={(e) => {
                dlg.resetFeedback();
                setClientId(e.target.value);
              }}
            >
              <option value="">All clients</option>
              {cfg.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {cfg.statuses && cfg.statuses.length > 0 ? (
          <label className="form-control">
            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
              {cfg.statusLabel ?? "Status"}
            </span>
            <select
              className="select select-bordered select-sm w-full"
              value={status}
              onChange={(e) => {
                dlg.resetFeedback();
                setStatus(e.target.value);
              }}
            >
              <option value="">All</option>
              {cfg.statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {cfg.types && cfg.types.length > 0 ? (
          <label className="form-control">
            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
              {cfg.typeLabel ?? "Type"}
            </span>
            <select
              className="select select-bordered select-sm w-full"
              value={type}
              onChange={(e) => {
                dlg.resetFeedback();
                setType(e.target.value);
              }}
            >
              <option value="">All</option>
              {cfg.types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {cfg.showDates !== false && cfg.dateKey ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="form-control">
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
                From
              </span>
              <input
                type="date"
                className="input input-bordered input-sm w-full"
                value={dateFrom}
                onChange={(e) => {
                  dlg.resetFeedback();
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
                  dlg.resetFeedback();
                  setDateTo(e.target.value);
                }}
              />
            </label>
          </div>
        ) : null}
      </ExportDialogShell>
    </>
  );
}
