import type { SupabaseClient } from "@supabase/supabase-js";
import { getManagedClientIds, filterByClientIds } from "@/lib/portfolio";
import type { UserRole } from "@/lib/types";

/** Load clients/campaigns/costs/invoices/work/contracts scoped for the role. */
export async function loadFinanceBundle(
  supabase: SupabaseClient,
  userId: string,
  role: UserRole,
) {
  const scope = await getManagedClientIds(supabase, userId, role);

  const [
    clientsRes,
    campaignsRes,
    costsRes,
    invoicesRes,
    workRes,
    contractsRes,
    paymentsRes,
    metricsRes,
    approvalsRes,
    profilesRes,
  ] = await Promise.all([
    supabase.from("clients").select("*").order("client_name"),
    supabase
      .from("campaigns")
      .select("*, clients(client_name)")
      .order("campaign_name"),
    supabase.from("costs").select("*"),
    supabase.from("invoices").select("*, payments(amount)"),
    supabase.from("work_entries").select("*"),
    supabase.from("contracts").select("*").order("end_date"),
    supabase.from("payments").select("*").order("payment_date", { ascending: false }),
    supabase.from("campaign_metrics").select("*"),
    supabase.from("approvals").select("*"),
    supabase
      .from("profiles")
      .select("id, full_name, email, role, department, internal_cost_rate")
      .neq("role", "client"),
  ]);

  let clients = clientsRes.data ?? [];
  if (scope !== "all") {
    clients = filterByClientIds(clients, scope, "id");
  }
  const clientIdSet = new Set(clients.map((c) => c.id));

  const campaigns = (campaignsRes.data ?? []).filter((c) =>
    scope === "all" ? true : clientIdSet.has(c.client_id),
  );
  const campaignIds = new Set(campaigns.map((c) => c.id));

  const costs = (costsRes.data ?? []).filter((c) => {
    if (scope === "all") return true;
    if (c.client_id && clientIdSet.has(c.client_id)) return true;
    if (c.campaign_id && campaignIds.has(c.campaign_id)) return true;
    return false;
  });

  const invoices = (invoicesRes.data ?? []).filter((i) =>
    scope === "all" ? true : clientIdSet.has(i.client_id),
  );
  const contracts = (contractsRes.data ?? []).filter((c) =>
    scope === "all" ? true : clientIdSet.has(c.client_id),
  );
  const work = (workRes.data ?? []).filter((w) =>
    scope === "all" ? true : campaignIds.has(w.campaign_id),
  );
  const payments = (paymentsRes.data ?? []).filter((p) =>
    scope === "all" ? true : clientIdSet.has(p.client_id),
  );
  const metrics = (metricsRes.data ?? []).filter((m) =>
    campaignIds.has(m.campaign_id),
  );
  const approvals = (approvalsRes.data ?? []).filter((a) =>
    scope === "all" ? true : clientIdSet.has(a.client_id),
  );

  return {
    scope,
    clients,
    campaigns,
    costs,
    invoices,
    work,
    contracts,
    payments,
    metrics,
    approvals,
    profiles: profilesRes.data ?? [],
  };
}
