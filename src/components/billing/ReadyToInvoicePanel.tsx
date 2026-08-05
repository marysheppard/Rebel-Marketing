"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  groupUnbilledByClient,
  summarizeEntries,
  type UnbilledEntry,
} from "@/lib/billing";
import { money } from "@/lib/format";

export function ReadyToInvoicePanel({
  entries,
  canManage,
  embedded = false,
}: {
  entries: UnbilledEntry[];
  canManage: boolean;
  /** When true, outer section chrome/title is handled by parent collapse. */
  embedded?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [workType, setWorkType] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const workTypes = useMemo(() => {
    return Array.from(new Set(entries.map((e) => e.work_type).filter(Boolean))).sort();
  }, [entries]);

  const campaigns = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) map.set(e.campaign_id, e.campaign_name);
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (dateFrom && e.work_date < dateFrom) return false;
      if (dateTo && e.work_date > dateTo) return false;
      if (workType && e.work_type !== workType) return false;
      if (campaignId && e.campaign_id !== campaignId) return false;
      return true;
    });
  }, [entries, dateFrom, dateTo, workType, campaignId]);

  const groups = useMemo(() => groupUnbilledByClient(filtered), [filtered]);
  const totals = useMemo(() => summarizeEntries(filtered), [filtered]);
  const selectedEntries = useMemo(
    () => filtered.filter((e) => selected.has(e.id)),
    [filtered, selected],
  );
  const selectionTotals = useMemo(
    () => summarizeEntries(selectedEntries),
    [selectedEntries],
  );

  const selectedClientId =
    selectedEntries.length === 0
      ? null
      : selectedEntries.every((e) => e.client_id === selectedEntries[0].client_id)
        ? selectedEntries[0].client_id
        : null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError(null);
  }

  function selectAllForClient(clientId: string) {
    const ids = filtered.filter((e) => e.client_id === clientId).map((e) => e.id);
    setSelected(new Set(ids));
    setError(null);
  }

  function createInvoice() {
    if (!canManage) return;
    if (selectedEntries.length === 0) {
      setError("Select at least one time entry.");
      return;
    }
    if (!selectedClientId) {
      setError("Selected entries must belong to a single client.");
      return;
    }
    const ids = selectedEntries.map((e) => e.id).join(",");
    router.push(`/app/billing/review?entries=${encodeURIComponent(ids)}`);
  }

  if (entries.length === 0) {
    return (
      <div className={embedded ? "" : "rounded-box border border-base-300 bg-base-100 p-6"}>
        {!embedded ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Ready to Invoice</h2>
              <p className="mt-1 text-sm opacity-70">
                Approved billable work appears here when it’s ready to invoice.
              </p>
            </div>
          </div>
        ) : null}
        <p className={embedded ? "text-sm opacity-60" : "mt-6 text-sm opacity-60"}>
          No approved unbilled work.
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        embedded
          ? "space-y-4"
          : "rounded-box border border-[#0b1f3a]/25 bg-gradient-to-br from-[#0b1f3a]/[0.04] to-base-100 p-5 sm:p-6 shadow-sm"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        {!embedded ? (
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#0b1f3a]">
              Ready to Invoice
            </h2>
            <p className="mt-1 text-sm text-[#1e3a5f]/90">
              {totals.count} entries · {totals.hours} hours · ~{money(totals.amount)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-[#1e3a5f]/90">
            {totals.count} entries · {totals.hours} hours · ~{money(totals.amount)}
          </p>
        )}
        {canManage ? (
          <button
            type="button"
            className="btn border-none bg-[#0b1f3a] px-6 text-white hover:bg-[#163054]"
            disabled={selected.size === 0}
            onClick={createInvoice}
          >
            Create Invoice
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="form-control">
          <span className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
            From
          </span>
          <input
            type="date"
            className="input input-bordered input-sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label className="form-control">
          <span className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
            To
          </span>
          <input
            type="date"
            className="input input-bordered input-sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
        <label className="form-control min-w-[9rem]">
          <span className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
            Work type
          </span>
          <select
            className="select select-bordered select-sm"
            value={workType}
            onChange={(e) => setWorkType(e.target.value)}
          >
            <option value="">All types</option>
            {workTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control min-w-[10rem]">
          <span className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
            Campaign
          </span>
          <select
            className="select select-bordered select-sm"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          >
            <option value="">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {(dateFrom || dateTo || workType || campaignId) && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setWorkType("");
              setCampaignId("");
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-[#0b1f3a]/15 bg-white/80 px-4 py-3 text-sm">
        <span className="font-semibold text-[#0b1f3a]">Selected</span>
        <span className="opacity-80">
          {selectionTotals.count} entries · {selectionTotals.hours}h · ~
          {money(selectionTotals.amount)}
        </span>
        {selected.size > 0 && !selectedClientId ? (
          <span className="text-error text-xs font-medium">
            Selection spans multiple clients — pick one client only.
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        {groups.length === 0 ? (
          <p className="text-sm opacity-60">No entries match the current filters.</p>
        ) : (
          groups.map((client) => {
            const clientEntryIds = client.campaigns.flatMap((c) =>
              c.entries.map((e) => e.id),
            );
            const clientSelected = clientEntryIds.filter((id) => selected.has(id)).length;

            return (
              <div
                key={client.client_id}
                className="overflow-hidden rounded-box border border-base-300 bg-base-100"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-base-300 bg-base-200/50 px-4 py-3">
                  <div>
                    <h3 className="font-bold">{client.client_name}</h3>
                    <p className="text-xs opacity-60">
                      {clientEntryIds.length} entries
                      {clientSelected ? ` · ${clientSelected} selected` : ""}
                    </p>
                  </div>
                  {canManage ? (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => selectAllForClient(client.client_id)}
                    >
                      Select all for this client
                    </button>
                  ) : null}
                </div>

                {client.campaigns.map((camp) => (
                  <div key={camp.campaign_id} className="border-b border-base-200 last:border-0">
                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide opacity-60">
                      {camp.campaign_name}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th className="w-10" />
                            <th>Date</th>
                            <th>Type</th>
                            <th className="text-right">Hours</th>
                            <th className="text-right">Est.</th>
                            <th>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {camp.entries.map((e) => (
                            <tr key={e.id} className="hover">
                              <td>
                                <input
                                  type="checkbox"
                                  className="checkbox checkbox-sm"
                                  checked={selected.has(e.id)}
                                  disabled={!canManage}
                                  onChange={() => toggle(e.id)}
                                  aria-label={`Select work on ${e.work_date}`}
                                />
                              </td>
                              <td className="whitespace-nowrap">{e.work_date}</td>
                              <td>{e.work_type}</td>
                              <td className="text-right">{num(e.hours)}</td>
                              <td className="text-right whitespace-nowrap">
                                {money(e.estimated_amount)}
                              </td>
                              <td className="max-w-xs truncate opacity-80">
                                {e.description || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function num(h: number) {
  return Number(h).toFixed(1);
}
