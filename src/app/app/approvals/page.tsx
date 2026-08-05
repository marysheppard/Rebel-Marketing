import { ApprovalsBoard } from "@/components/ApprovalsBoard";
import { CreateApprovalForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { daysBetween, joinOne, num } from "@/lib/format";
import {
  canCreateApprovals,
  getProfile,
  isClientRole,
  isMarketingRole,
} from "@/lib/page-auth";
import { redirect } from "next/navigation";

export default async function ApprovalsPage() {
  const { supabase, profile, userId } = await getProfile();
  if (!profile || !userId) return null;

  if (!isMarketingRole(profile.role) && !isClientRole(profile.role)) {
    redirect("/app");
  }

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

  const list = approvals ?? [];
  const isClient = isClientRole(profile.role);
  const showCreateForm = canCreateApprovals(profile.role) && !isClient;

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
      client_name: clientObj?.client_name ?? "—",
      campaign_name: campObj?.campaign_name ?? "—",
      waitingDays,
    };
  });

  const pending = items.filter((a) => a.approval_status === "Pending");
  const pendingCount = pending.length;
  const overdueCount = pending.filter(
    (a) => a.waitingDays != null && a.waitingDays >= 7,
  ).length;
  const avgWaitDays =
    pendingCount === 0
      ? null
      : Math.round(
          pending.reduce((sum, a) => sum + (a.waitingDays ?? 0), 0) /
            pendingCount,
        );

  const statusPie = [
    {
      name: "Pending",
      value: items.filter((a) => a.approval_status === "Pending").length,
    },
    {
      name: "Changes Requested",
      value: items.filter((a) => a.approval_status === "Changes Requested")
        .length,
    },
    {
      name: "Approved",
      value: items.filter((a) => a.approval_status === "Approved").length,
    },
    {
      name: "Rejected",
      value: items.filter((a) => a.approval_status === "Rejected").length,
    },
  ];

  const agingBars = [
    {
      bucket: "0–2d",
      count: pending.filter(
        (a) => a.waitingDays != null && a.waitingDays <= 2,
      ).length,
    },
    {
      bucket: "3–6d",
      count: pending.filter(
        (a) =>
          a.waitingDays != null && a.waitingDays >= 3 && a.waitingDays <= 6,
      ).length,
    },
    {
      bucket: "7d+",
      count: pending.filter(
        (a) => a.waitingDays != null && a.waitingDays >= 7,
      ).length,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Approval Center"
        subtitle="Client sign-off on creative, budget, and launch decisions"
      />

      <ApprovalsBoard
        items={items}
        isClient={isClient}
        statusPie={statusPie}
        agingBars={agingBars}
        pendingCount={pendingCount}
        overdueCount={overdueCount}
        avgWaitDays={avgWaitDays}
      />

      {showCreateForm ? (
        <section className="mt-8 rounded-box border border-base-300 bg-base-100 p-6">
          <h2 className="mb-4 text-xl font-bold">Request approval</h2>
          <CreateApprovalForm
            userId={userId}
            campaigns={(campaigns ?? []).map((c) => {
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
