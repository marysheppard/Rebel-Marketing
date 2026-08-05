"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { activateEngagement } from "@/lib/activate-engagement";
import { createClient } from "@/lib/supabase/client";
import type { Contract } from "@/lib/types";

type Props = {
  contract: Pick<
    Contract,
    | "id"
    | "client_id"
    | "contract_name"
    | "contract_number"
    | "contract_status"
    | "start_date"
    | "end_date"
    | "billing_method"
    | "monthly_retainer"
    | "project_fee"
    | "campaign_budget"
    | "payment_terms"
    | "service_types"
    | "deliverables"
    | "scope"
    | "deposit_amount"
  >;
  hasCampaign: boolean;
};

export function ActivateEngagementButton({ contract, hasCampaign }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (contract.contract_status !== "Active" && contract.contract_status !== "Fully Executed") {
    return null;
  }

  async function onActivate() {
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const result = await activateEngagement(supabase, contract);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessage(
      result.campaignId
        ? "Engagement ready — campaign (and draft invoice when fees apply) linked to this client."
        : "Nothing to activate.",
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={loading}
        onClick={onActivate}
      >
        {loading
          ? "Activating…"
          : hasCampaign
            ? "Sync engagement"
            : "Activate engagement"}
      </button>
      {error ? <span className="text-xs text-error">{error}</span> : null}
      {message ? <span className="text-xs text-success">{message}</span> : null}
    </div>
  );
}
