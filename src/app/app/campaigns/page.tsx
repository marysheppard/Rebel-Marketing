import { CampaignsBoard } from "@/components/CampaignsBoard";
import { budgetHealth } from "@/lib/finance";
import { num } from "@/lib/format";
import {
  canManageCampaigns,
  getProfile,
  isClientRole,
  isMarketingRole,
} from "@/lib/page-auth";
import { redirect } from "next/navigation";

export default async function CampaignsPage() {
  const { supabase, profile } = await getProfile();
  if (!profile) return null;

  if (!isMarketingRole(profile.role) && !isClientRole(profile.role)) {
    redirect("/app");
  }

  const [{ data: campaigns }, { data: clients }, { data: contracts }, { data: costs }] =
    await Promise.all([
      supabase
        .from("campaigns")
        .select("*, clients(client_name)")
        .order("start_date", { ascending: false }),
      supabase.from("clients").select("id, client_name").order("client_name"),
      supabase
        .from("contracts")
        .select("id, contract_name, contract_number, client_id")
        .order("contract_name"),
      supabase.from("costs").select("campaign_id, amount"),
    ]);

  const spentByCampaign = new Map<string, number>();
  for (const c of costs ?? []) {
    if (!c.campaign_id) continue;
    spentByCampaign.set(
      c.campaign_id,
      (spentByCampaign.get(c.campaign_id) ?? 0) + num(c.amount),
    );
  }

  const list = campaigns ?? [];
  const showCreate =
    canManageCampaigns(profile.role) && !isClientRole(profile.role);

  const items = list.map((c) => {
    const clientsRel = c.clients as
      | { client_name?: string }
      | { client_name?: string }[]
      | null;
    const clientObj = Array.isArray(clientsRel) ? clientsRel[0] : clientsRel;
    const budget = num(c.campaign_budget);
    const spent = spentByCampaign.get(c.id) ?? 0;
    const health = budgetHealth(budget, spent);
    return {
      id: String(c.id),
      client_id: String(c.client_id),
      campaign_name: String(c.campaign_name),
      client_name: clientObj?.client_name ?? "—",
      campaign_type: String(c.campaign_type ?? ""),
      campaign_status: String(c.campaign_status),
      start_date: String(c.start_date ?? ""),
      end_date: String(c.end_date ?? ""),
      budget,
      spent,
      remaining: budget - spent,
      health,
    };
  });

  const activeCount = items.filter((c) => c.campaign_status === "Active").length;
  const lateCount = items.filter((c) => c.campaign_status === "Late").length;
  const overBudgetCount = items.filter((c) => c.health === "over").length;

  const statusNames = [
    "Active",
    "Late",
    "On Hold",
    "Completed",
    "Canceled",
  ];
  const statusPie: { name: string; value: number }[] = statusNames.map(
    (name) => ({
      name,
      value: items.filter((c) => c.campaign_status === name).length,
    }),
  );
  const known = new Set(statusNames);
  const other = items.filter((c) => !known.has(c.campaign_status)).length;
  if (other > 0) {
    statusPie.push({ name: "Other", value: other });
  }

  const budgetHealthBars = [
    {
      bucket: "Under",
      count: items.filter((c) => c.health === "under").length,
    },
    {
      bucket: "Near",
      count: items.filter((c) => c.health === "near").length,
    },
    {
      bucket: "Over",
      count: items.filter((c) => c.health === "over").length,
    },
    {
      bucket: "No budget",
      count: items.filter((c) => c.health === "unknown").length,
    },
  ];

  return (
    <CampaignsBoard
      items={items}
      showCreate={showCreate}
      clients={(clients ?? []).map((c) => ({ id: c.id, label: c.client_name }))}
      contracts={(contracts ?? []).map((c) => ({
        id: c.id,
        label: `${c.contract_name} (${c.contract_number})`,
        client_id: c.client_id,
      }))}
      statusPie={statusPie}
      budgetHealthBars={budgetHealthBars}
      activeCount={activeCount}
      lateCount={lateCount}
      overBudgetCount={overBudgetCount}
    />
  );
}
