"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReadyMilestone } from "@/lib/billing";
import { money } from "@/lib/format";
import { daysBetween } from "@/lib/format";

export function ReadyMilestonesPanel({
  milestones,
  canManage,
  embedded = false,
}: {
  milestones: ReadyMilestone[];
  canManage: boolean;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const selectedRows = useMemo(
    () => milestones.filter((m) => selected.has(m.id)),
    [milestones, selected],
  );

  const selectedClientId =
    selectedRows.length === 0
      ? null
      : selectedRows.every((m) => m.client_id === selectedRows[0].client_id)
        ? selectedRows[0].client_id
        : null;

  const total = selectedRows.reduce(
    (s, m) => s + Number(m.recognition_amount || 0),
    0,
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError(null);
  }

  function createInvoice() {
    if (!canManage) return;
    if (!selectedRows.length) {
      setError("Select at least one milestone.");
      return;
    }
    if (!selectedClientId) {
      setError("Selected milestones must belong to a single client.");
      return;
    }
    const ids = selectedRows.map((m) => m.id).join(",");
    router.push(`/app/billing/review?milestones=${encodeURIComponent(ids)}`);
  }

  if (!milestones.length) {
    return (
      <p className={embedded ? "text-sm opacity-60" : "text-sm opacity-60"}>
        No approved milestones waiting to bill. Approve milestones on the campaign
        to earn revenue and queue them here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm opacity-70">
          Approved billable milestones not yet invoiced — recognition can precede
          cash collection.
        </p>
        {canManage ? (
          <button
            type="button"
            className="btn border-none bg-[#0b1f3a] px-5 text-white hover:bg-[#163054]"
            disabled={selected.size === 0}
            onClick={createInvoice}
          >
            Create Invoice
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#0b1f3a]/15 bg-white/80 px-4 py-3 text-sm">
        <span className="font-semibold text-[#0b1f3a]">Selected</span>
        <span className="opacity-80">
          {selectedRows.length} · ~{money(total)}
        </span>
        {selected.size > 0 && !selectedClientId ? (
          <span className="text-error text-xs font-medium">
            Selection spans multiple clients — pick one client only.
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-box border border-base-300">
        <table className="table table-sm">
          <thead>
            <tr>
              <th className="w-10" />
              <th>Client</th>
              <th>Campaign</th>
              <th>Milestone</th>
              <th className="text-right">Amount</th>
              <th>Approved</th>
              <th>Waiting</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((m) => {
              const wait =
                m.approved_at != null
                  ? Math.max(0, daysBetween(m.approved_at, new Date()))
                  : null;
              return (
                <tr key={m.id} className="hover">
                  <td>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={selected.has(m.id)}
                      disabled={!canManage}
                      onChange={() => toggle(m.id)}
                      aria-label={`Select ${m.name}`}
                    />
                  </td>
                  <td className="font-medium">{m.client_name}</td>
                  <td>{m.campaign_name}</td>
                  <td>{m.name}</td>
                  <td className="text-right tabular-nums">
                    {money(m.recognition_amount)}
                  </td>
                  <td className="whitespace-nowrap text-xs">
                    {m.approved_at
                      ? m.approved_at.slice(0, 10)
                      : "—"}
                  </td>
                  <td className="text-xs opacity-70">
                    {wait != null ? `${wait}d` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
