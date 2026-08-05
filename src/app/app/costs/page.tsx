import { CostsBoard } from "@/components/CostsBoard";
import { num } from "@/lib/format";
import { canManageCosts, getProfile, isClientRole } from "@/lib/page-auth";
import { redirect } from "next/navigation";

export default async function CostsPage() {
  const { supabase, profile } = await getProfile();
  if (!profile) return null;

  if (isClientRole(profile.role) || !canManageCosts(profile.role)) {
    redirect("/app");
  }

  const [{ data: costs }, { data: campaigns }] = await Promise.all([
    supabase
      .from("costs")
      .select("*, campaigns(campaign_name, campaign_budget)")
      .order("cost_date", { ascending: false }),
    supabase
      .from("campaigns")
      .select("id, campaign_name")
      .in("campaign_status", ["Active", "Late", "On Hold", "Completed"])
      .order("campaign_name"),
  ]);

  const list = costs ?? [];

  const spentByCampaign = new Map<string, number>();
  const budgetByCampaign = new Map<string, number>();
  const spendByType = new Map<string, number>();
  const spendByCampaignName = new Map<string, { name: string; amount: number }>();

  for (const c of list) {
    const amount = num(c.amount);
    const camp = c.campaigns as
      | { campaign_name?: string; campaign_budget?: number }
      | { campaign_name?: string; campaign_budget?: number }[]
      | null;
    const campObj = Array.isArray(camp) ? camp[0] : camp;

    if (c.campaign_id) {
      spentByCampaign.set(
        c.campaign_id,
        (spentByCampaign.get(c.campaign_id) ?? 0) + amount,
      );
      if (campObj?.campaign_budget != null) {
        budgetByCampaign.set(c.campaign_id, num(campObj.campaign_budget));
      }
      const name = campObj?.campaign_name ?? "—";
      const prev = spendByCampaignName.get(c.campaign_id);
      spendByCampaignName.set(c.campaign_id, {
        name,
        amount: (prev?.amount ?? 0) + amount,
      });
    }

    const type = String(c.cost_type || "Other");
    spendByType.set(type, (spendByType.get(type) ?? 0) + amount);
  }

  const items = list.map((c) => {
    const camp = c.campaigns as
      | { campaign_name?: string }
      | { campaign_name?: string }[]
      | null;
    const campObj = Array.isArray(camp) ? camp[0] : camp;
    return {
      id: String(c.id),
      cost_date: String(c.cost_date),
      campaign_id: c.campaign_id ? String(c.campaign_id) : null,
      campaign_name: campObj?.campaign_name ?? "—",
      cost_type: String(c.cost_type ?? ""),
      description: String(c.description || c.vendor_name || ""),
      amount: num(c.amount),
      approved: Boolean(c.approved),
      pass_through: Boolean(c.pass_through),
    };
  });

  const totalSpend = items.reduce((s, c) => s + c.amount, 0);
  const unapprovedTotal = items
    .filter((c) => !c.approved)
    .reduce((s, c) => s + c.amount, 0);
  const passThroughTotal = items
    .filter((c) => c.pass_through)
    .reduce((s, c) => s + c.amount, 0);

  let overBudgetCampaigns = 0;
  for (const [id, spent] of spentByCampaign) {
    const budget = budgetByCampaign.get(id) ?? 0;
    if (budget > 0 && spent > budget) overBudgetCampaigns += 1;
  }

  const typePie = [...spendByType.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const byCampaign = [...spendByCampaignName.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const showCreate =
    canManageCosts(profile.role) && !isClientRole(profile.role);

  return (
    <CostsBoard
      items={items}
      showCreate={showCreate}
      campaigns={(campaigns ?? []).map((c) => ({
        id: c.id,
        label: c.campaign_name,
      }))}
      typePie={typePie}
      byCampaign={byCampaign}
      totalSpend={totalSpend}
      unapprovedTotal={unapprovedTotal}
      passThroughTotal={passThroughTotal}
      overBudgetCampaigns={overBudgetCampaigns}
    />
  );
}
