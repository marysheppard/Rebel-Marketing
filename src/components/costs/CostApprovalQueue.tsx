"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/format";

export type PendingCostItem = {
  id: string;
  cost_date: string;
  cost_type: string;
  description: string;
  amount: number;
  vendor_name: string;
  campaign_name: string;
  client_name: string;
  pass_through: boolean;
};

export function CostApprovalQueue({ items }: { items: PendingCostItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      new URLSearchParams(window.location.search).get("approval") === "pending"
    ) {
      document.getElementById("pending-approvals")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  if (items.length === 0) {
    return (
      <section
        id="pending-approvals"
        className="mb-6 scroll-mt-24 rounded-box border border-base-300 bg-base-100 p-4"
      >
        <h2 className="text-lg font-semibold">Pending cost approvals</h2>
        <p className="mt-1 text-sm opacity-70">
          No costs are waiting for your approval.
        </p>
      </section>
    );
  }

  async function decide(costId: string, decision: "Approved" | "Unapproved") {
    setError(null);
    setBusyId(costId);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("set_cost_approval", {
      p_cost_id: costId,
      p_decision: decision,
    });
    setBusyId(null);
    if (rpcError) {
      setError(rpcError.message || "Could not update cost approval.");
      return;
    }
    const result = data as { ok?: boolean; error?: string } | null;
    if (result && result.ok === false) {
      setError(result.error || "Could not update cost approval.");
      return;
    }
    router.refresh();
  }

  return (
    <section
      id="pending-approvals"
      className="mb-6 scroll-mt-24 rounded-box border border-warning/40 bg-base-100 p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Pending cost approvals</h2>
          <p className="text-sm opacity-70">
            Review spend recorded by account managers and marketing before it
            counts on the Costs dashboard.
          </p>
        </div>
        <span className="badge badge-warning badge-sm">
          {items.length} pending
        </span>
      </div>
      {error ? (
        <p className="mb-3 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-box border border-base-300 p-3"
          >
            <div className="min-w-0">
              <p className="font-semibold tabular-nums">{money(item.amount)}</p>
              <p className="text-sm font-medium">{item.cost_type}</p>
              <p className="mt-1 text-xs opacity-60">
                {item.client_name} · {item.campaign_name} · {item.cost_date}
                {item.vendor_name ? ` · ${item.vendor_name}` : ""}
                {item.pass_through ? " · Pass-through" : ""}
              </p>
              {item.description ? (
                <p className="mt-1 line-clamp-2 text-sm opacity-70">
                  {item.description}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-success btn-sm"
                disabled={busyId === item.id}
                onClick={() => void decide(item.id, "Approved")}
              >
                {busyId === item.id ? "…" : "Approve"}
              </button>
              <button
                type="button"
                className="btn btn-outline btn-error btn-sm"
                disabled={busyId === item.id}
                onClick={() => void decide(item.id, "Unapproved")}
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
