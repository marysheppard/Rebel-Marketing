import { ApprovalsBoard } from "@/components/ApprovalsBoard";
import { CreateApprovalForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import {
  buildAgingBars,
  buildApprovalKpis,
  buildStatusPie,
} from "@/lib/approvals-metrics";
import { daysBetween, joinOne, num } from "@/lib/format";
import {
  canCreateApprovals,
  getProfile,
  isClientRole,
  isMarketingRole,
} from "@/lib/page-auth";
import { getManagedClientIds } from "@/lib/portfolio";
import { redirect } from "next/navigation";

export default async function ApprovalsPage() {
  const { supabase, profile, userId } = await getProfile();
  if (!profile || !userId) return null;

  if (
    !isMarketingRole(profile.role) &&
    !isClientRole(profile.role) &&
    profile.role !== "account_manager" &&
    profile.role !== "agency_manager"
  ) {
    redirect("/app");
  }

  const scope = await getManagedClientIds(supabase, userId, profile.role);
  const isClient = isClientRole(profile.role);
  const showCreateForm = canCreateApprovals(profile.role) && !isClient;
  const variant =
    profile.role === "account_manager" || profile.role === "agency_manager"
      ? "advanced"
      : "simple";

  const [{ data: approvals }, { data: campaigns }] = await Promise.all([
    supabase
      .from("approvals")
      .select("*, clients(client_name), campaigns(campaign_name)")
      .order("requested_date", { ascending: false }),
    supabase
      .from("campaigns")
      .select(
        "id, campaign_name, client_id, contracts(approval_required, spending_approval_threshold)",
      )
      .in("campaign_status", ["Active", "Late", "On Hold"])
      .order("campaign_name"),
  ]);

  let list = approvals ?? [];
  let campaignList = campaigns ?? [];
  // Scope Account Manager to their book only (other staff keep prior firm-wide view).
  if (profile.role === "account_manager" && scope !== "all") {
    const set = new Set(scope);
    list = list.filter((a) => set.has(String(a.client_id)));
    campaignList = campaignList.filter((c) => set.has(String(c.client_id)));
  }

  const items = list.map((a) => {
    const clients = a.clients as
      | { client_name?: string }
      | { client_name?: string }[]
      | null;
    const campaignsRel = a.campaigns as
      | { campaign_name?: string }
      | { campaign_name?: string }[]
      | null;
    const clientObj = Array.isArray(clients) ? clients[0] : clients;
    const campObj = Array.isArray(campaignsRel) ? campaignsRel[0] : campaignsRel;
    const waitingDays =
      a.approval_status === "Pending" ? daysBetween(a.requested_date) : null;
    return {
      id: String(a.id),
      client_id: String(a.client_id),
      campaign_id: String(a.campaign_id),
      approval_type: String(a.approval_type),
      description: String(a.description ?? ""),
      requested_date: String(a.requested_date),
      approval_status: String(a.approval_status),
      client_name: clientObj?.client_name ?? "-",
      campaign_name: campObj?.campaign_name ?? "-",
      waitingDays,
    };
  });

  const kpis = buildApprovalKpis(items);
  const statusPie = buildStatusPie(items);
  const agingBars = buildAgingBars(items);

  return (
    <div>
      <PageHeader
        title="Approval Center"
        subtitle={
          profile.role === "account_manager"
            ? "Sign-off analytics for your client book"
            : "Client sign-off on creative, budget, and launch decisions"
        }
      />

      <ApprovalsBoard
        items={items}
        isClient={isClient}
        variant={variant}
        statusPie={statusPie}
        agingBars={agingBars}
        pendingCount={kpis.pendingCount}
        overdueCount={kpis.overdueCount}
        avgWaitDays={kpis.avgWaitDays}
      />

      {showCreateForm ? (
        <section className="mt-8 rounded-box border border-base-300 bg-base-100 p-6">
          <h2 className="mb-4 text-xl font-bold">Request approval</h2>
          <CreateApprovalForm
            userId={userId}
            campaigns={campaignList.map((c) => {
              const contract = joinOne(
                (
                  c as {
                    contracts?:
                      | {
                          approval_required: boolean;
                          spending_approval_threshold: number;
                        }
                      | {
                          approval_required: boolean;
                          spending_approval_threshold: number;
                        }[]
                      | null;
                  }
                ).contracts,
              );
              return {
                id: c.id,
                label: c.campaign_name,
                client_id: c.client_id,
                approval_required: Boolean(contract?.approval_required),
                spending_approval_threshold: num(
                  contract?.spending_approval_threshold,
                ),
              };
            })}
          />
        </section>
      ) : null}
    </div>
  );
}
