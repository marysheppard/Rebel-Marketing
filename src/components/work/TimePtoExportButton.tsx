"use client";

import { useMemo, useState } from "react";
import type { PtoItem, TimeEntryItem } from "@/components/TimePtoBoard";
import {
  ExportDialogShell,
  ExportTriggerButton,
  useExportDialogState,
} from "@/components/exports/ExportDialogShell";
import {
  countTimePtoMatches,
  downloadTimePtoExport,
  type TimePtoExportKind,
} from "@/lib/work/time-pto-export";

export function TimePtoExportButton({
  entries,
  pto,
  className = "btn btn-outline btn-sm gap-1",
}: {
  entries: TimeEntryItem[];
  pto: PtoItem[];
  className?: string;
}) {
  const dlg = useExportDialogState();
  const [kind, setKind] = useState<TimePtoExportKind>("both");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [ptoStatus, setPtoStatus] = useState("");

  const campaigns = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) map.set(e.campaign_id, e.campaign_name);
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);

  const approvalStatuses = useMemo(() => {
    const set = new Set(entries.map((e) => e.approval_status).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const ptoStatuses = useMemo(() => {
    const set = new Set(pto.map((p) => p.status).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [pto]);

  const filters = {
    kind,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    campaignId: campaignId || undefined,
    approvalStatus: approvalStatus || undefined,
    ptoStatus: ptoStatus || undefined,
  };

  const matchCount = useMemo(
    () => countTimePtoMatches(entries, pto, filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, pto, kind, dateFrom, dateTo, campaignId, approvalStatus, ptoStatus],
  );

  function onExport() {
    dlg.resetFeedback();
    dlg.setBusy(true);
    try {
      const result = downloadTimePtoExport(entries, pto, filters, dlg.format);
      dlg.setMessage(
        result.count === 0
          ? "No rows matched — empty file downloaded."
          : `Downloaded ${result.filename} (${result.count} row${result.count === 1 ? "" : "s"}).`,
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
        title="Export time & PTO"
        description="Choose time entries, PTO, or both — filter by date and status, then download."
        matchCount={matchCount}
        matchLabel="rows"
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
            What to export
          </span>
          <select
            className="select select-bordered select-sm w-full"
            value={kind}
            onChange={(e) => {
              dlg.resetFeedback();
              setKind(e.target.value as TimePtoExportKind);
            }}
          >
            <option value="both">Time entries + PTO</option>
            <option value="time">Time entries only</option>
            <option value="pto">PTO only</option>
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

        {kind !== "pto" ? (
          <>
            <label className="form-control">
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
                Campaign
              </span>
              <select
                className="select select-bordered select-sm w-full"
                value={campaignId}
                onChange={(e) => {
                  dlg.resetFeedback();
                  setCampaignId(e.target.value);
                }}
              >
                <option value="">All campaigns</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-control">
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
                Approval status
              </span>
              <select
                className="select select-bordered select-sm w-full"
                value={approvalStatus}
                onChange={(e) => {
                  dlg.resetFeedback();
                  setApprovalStatus(e.target.value);
                }}
              >
                <option value="">All</option>
                {approvalStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}

        {kind !== "time" ? (
          <label className="form-control">
            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
              PTO status
            </span>
            <select
              className="select select-bordered select-sm w-full"
              value={ptoStatus}
              onChange={(e) => {
                dlg.resetFeedback();
                setPtoStatus(e.target.value);
              }}
            >
              <option value="">All</option>
              {ptoStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </ExportDialogShell>
    </>
  );
}
