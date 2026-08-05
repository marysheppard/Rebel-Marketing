"use client";

import { StatusBadge } from "@/components/ui";
import { INVOICE_STATUS_BADGE_MAP } from "@/lib/billing";

export function BillingStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} map={INVOICE_STATUS_BADGE_MAP} />;
}
