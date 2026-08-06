"use client";

import { useMemo, useState } from "react";
import type { CampaignBoardItem } from "@/components/CampaignsBoard";
import {
  ExportDialogShell,
  ExportTriggerButton,
  useExportDialogState,
} from "@/components/exports/ExportDialogShell";
import {
  downloadCampaignOverviewExport,
  filterCampaignsForExport,
} from "@/lib/campaigns/campaign-export";

export function CampaignExportButton({
  items,
  className = "btn btn-outline btn-sm gap-1",
}: {
  items: CampaignBoardItem[];
  className?: string;
}) {
  const dlg = useExportDialogState();
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const clients = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of items) map.set(i.client_id, i.client_name);
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const statuses = useMemo(() => {
    const set = new Set(items.map((i) => i.campaign_status).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filters = {
    clientId: clientId || undefined,
    status: status || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const matchCount = useMemo(
    () => filterCampaignsForExport(items, filters).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, clientId, status, dateFrom, dateTo],
  );

  function onExport() {
    dlg.resetFeedback();
    dlg.setBusy(true);
    try {
      const result = downloadCampaignOverviewExport(items, filters, dlg.format);
      dlg.setMessage(
        result.count === 0
          ? "No campaigns matched — empty file downloaded."
          : `Downloaded ${result.filename} (${result.count} campaign${result.count === 1 ? "" : "s"}).`,
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
        title="Export campaign overview"
        description="Filter by client, status, and date range, then download CSV or PDF."
        matchCount={matchCount}
        matchLabel="campaigns"
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
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control">
          <span className="label-text mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
            Status
          </span>
          <select
            className="select select-bordered select-sm w-full"
            value={status}
            onChange={(e) => {
              dlg.resetFeedback();
              setStatus(e.target.value);
            }}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
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
      </ExportDialogShell>
    </>
  );
}
