"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateMilestoneStatus } from "@/app/actions/milestones";
import { StatusBadge } from "@/components/ui";
import { money, pct } from "@/lib/format";
import {
  daysLate,
  daysUntilTarget,
  nextMilestone,
  revenuePctRecognized,
  schedulePctComplete,
  sumRecognized,
  sumMilestonePlan,
} from "@/lib/milestones";
import type { CampaignMilestone, MilestoneStatus } from "@/lib/types";

export function CampaignMilestonesPanel({
  milestones: initial,
  canComplete,
  canApprove,
}: {
  milestones: CampaignMilestone[];
  canComplete: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const plan = sumMilestonePlan(initial);
  const recognized = sumRecognized(initial);
  const schedulePct = schedulePctComplete(initial);
  const revPct = revenuePctRecognized(initial);
  const next = nextMilestone(initial);
  const nextDays = next ? daysUntilTarget(next.target_date) : null;
  const nextLate = next ? daysLate(next.target_date) : null;

  function setStatus(id: string, status: MilestoneStatus) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const res = await updateMilestoneStatus(id, status);
      setBusyId(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  if (!initial.length) {
    return (
      <section className="mt-8">
        <h2 className="mb-2 text-xl font-bold">Revenue milestones</h2>
        <p className="text-sm opacity-60">
          No milestone plan for this campaign. Project recognition falls back to
          time-based estimates. Apply{" "}
          <code className="text-xs">supabase/seed_campaign_milestones.sql</code>{" "}
          for demo milestones.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-4">
      <div>
        <h2 className="text-xl font-bold">Revenue milestones</h2>
        <p className="mt-1 text-sm opacity-70">
          Management recognition when milestones are <strong>Approved</strong>{" "}
          (not GAAP). Schedule % is operational; revenue % is earned dollars.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <div className="text-xs uppercase opacity-60">Schedule complete</div>
          <div className="mt-1 text-2xl font-bold">
            {schedulePct != null ? pct(schedulePct) : "—"}
          </div>
        </div>
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <div className="text-xs uppercase opacity-60">Revenue recognized</div>
          <div className="mt-1 text-2xl font-bold">
            {revPct != null ? pct(revPct) : "—"}
          </div>
          <div className="text-xs opacity-60">
            {money(recognized)} of {money(plan)}
          </div>
        </div>
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <div className="text-xs uppercase opacity-60">Next milestone</div>
          <div className="mt-1 text-lg font-bold leading-snug">
            {next?.name ?? "—"}
          </div>
          {next?.target_date ? (
            <div className="text-xs opacity-60">Target {next.target_date}</div>
          ) : null}
        </div>
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <div className="text-xs uppercase opacity-60">Days to next ETA</div>
          <div
            className={`mt-1 text-2xl font-bold ${
              nextLate && nextLate > 0 ? "text-error" : ""
            }`}
          >
            {nextDays == null
              ? "—"
              : nextDays < 0
                ? `${Math.abs(nextDays)}d late`
                : `${nextDays}d`}
          </div>
        </div>
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
              <th>#</th>
              <th>Milestone</th>
              <th className="text-right">Amount</th>
              <th>Target</th>
              <th>Status</th>
              <th>Billing</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {initial
              .slice()
              .sort((a, b) => a.sequence - b.sequence)
              .map((m) => {
                const late =
                  !["Approved", "Waived"].includes(m.status) &&
                  (daysLate(m.target_date) ?? 0) > 0;
                return (
                  <tr key={m.id} className="align-top">
                    <td>{m.sequence}</td>
                    <td>
                      <div className="font-medium">{m.name}</div>
                      {m.notes ? (
                        <div className="text-xs opacity-55 max-w-xs">{m.notes}</div>
                      ) : null}
                    </td>
                    <td className="text-right tabular-nums">
                      {money(m.recognition_amount)}
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      {m.target_date ?? "—"}
                      {late ? (
                        <span className="ml-1 text-error font-medium">
                          late
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="text-xs">
                      {m.billed ? (
                        <span className="badge badge-ghost badge-sm">Billed</span>
                      ) : m.status === "Approved" && m.billable ? (
                        <span className="badge badge-warning badge-sm">
                          Ready to bill
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        {canComplete &&
                        ["Planned"].includes(m.status) ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            disabled={pending && busyId === m.id}
                            onClick={() => setStatus(m.id, "In Progress")}
                          >
                            Start
                          </button>
                        ) : null}
                        {canComplete &&
                        ["Planned", "In Progress"].includes(m.status) ? (
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            disabled={pending && busyId === m.id}
                            onClick={() => setStatus(m.id, "Complete")}
                          >
                            Complete
                          </button>
                        ) : null}
                        {canApprove &&
                        ["Complete", "In Progress"].includes(m.status) ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            disabled={pending && busyId === m.id}
                            onClick={() => setStatus(m.id, "Approved")}
                          >
                            Approve
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
