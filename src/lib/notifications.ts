import { buildControlAlerts } from "@/lib/controls";
import { loadFinanceBundle } from "@/lib/finance-data";
import { remainingBalance } from "@/lib/finance";
import type { Profile } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Lightweight notification count for the app header badge. */
export async function getNotificationCount(
  supabase: SupabaseClient,
  profile: Profile,
  userId: string,
): Promise<number> {
  if (
    profile.role === "agency_manager" ||
    profile.role === "account_manager"
  ) {
    const bundle = await loadFinanceBundle(supabase, userId, profile.role);
    const alerts = buildControlAlerts({
      campaigns: bundle.campaigns,
      contracts: bundle.contracts,
      costs: bundle.costs,
      work: bundle.work,
      approvals: bundle.approvals,
      invoices: bundle.invoices,
      clients: bundle.clients,
    });
    return alerts.length;
  }

  if (profile.role === "marketing" || profile.role === "billing") {
    const today = new Date().toISOString().slice(0, 10);
    const inThree = new Date();
    inThree.setDate(inThree.getDate() + 3);
    const dueSoon = inThree.toISOString().slice(0, 10);

    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, due_date, status")
      .eq("assignee_id", userId)
      .neq("status", "Completed");

    return (tasks ?? []).filter((t) => {
      if (!t.due_date) return false;
      return t.due_date <= dueSoon;
    }).length;
  }

  if (profile.role === "client") {
    const { data: invoices } = await supabase
      .from("invoices")
      .select("*, payments(amount)")
      .in("status", ["Sent", "Partially Paid", "Overdue", "Disputed"]);

    const overdue = (invoices ?? []).filter(
      (i) =>
        remainingBalance(i) > 0 &&
        new Date(i.due_date) < new Date() &&
        i.status !== "Paid",
    ).length;

    const { count } = await supabase
      .from("approvals")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "Pending");

    return overdue + (count ?? 0);
  }

  return 0;
}
