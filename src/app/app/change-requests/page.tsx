import { ClientChangeRequestsBoard } from "@/components/ClientChangeRequestsBoard";
import { PageHeader } from "@/components/ui";
import { isClientChangeType } from "@/lib/change-requests";
import { getProfile, isClientRole } from "@/lib/page-auth";
import { redirect } from "next/navigation";

export default async function ChangeRequestsPage() {
  const { supabase, profile, userId } = await getProfile();
  if (!profile || !userId) redirect("/login");
  if (!isClientRole(profile.role)) redirect("/app/approvals");

  const [
    { data: clientsData },
    { data: campaignsData },
    { data: approvalsData },
  ] = await Promise.all([
    supabase.from("clients").select("id").order("client_name"),
    supabase
      .from("campaigns")
      .select("id, client_id, campaign_name, campaign_status")
      .order("campaign_name"),
    supabase
      .from("approvals")
      .select(
        "id, approval_type, description, notes, requested_date, approval_status, client_id, campaigns(campaign_name)",
      )
      .order("requested_date", { ascending: false }),
  ]);

  const clientIds = new Set((clientsData ?? []).map((c) => String(c.id)));
  const campaigns = (campaignsData ?? [])
    .filter((c) => {
      if (!clientIds.has(String(c.client_id))) return false;
      const status = String(c.campaign_status ?? "");
      // Completed (and canceled) campaigns are not eligible for new change requests.
      return status !== "Completed" && status !== "Canceled";
    })
    .map((c) => ({
      id: String(c.id),
      client_id: String(c.client_id),
      campaign_name: String(c.campaign_name),
      campaign_status: String(c.campaign_status ?? ""),
    }));

  const requests = (approvalsData ?? [])
    .filter(
      (a) =>
        clientIds.has(String(a.client_id)) &&
        isClientChangeType(String(a.approval_type)),
    )
    .map((a) => {
      const camps = a.campaigns as
        | { campaign_name?: string }
        | { campaign_name?: string }[]
        | null;
      const camp = Array.isArray(camps) ? camps[0] : camps;
      return {
        id: String(a.id),
        approval_type: String(a.approval_type),
        description: String(a.description ?? ""),
        notes: String(a.notes ?? ""),
        requested_date: String(a.requested_date ?? ""),
        approval_status: String(a.approval_status ?? ""),
        campaign_name: camp?.campaign_name ?? "Campaign",
      };
    });

  return (
    <div>
      <PageHeader
        title="Request a change"
        subtitle="Ask Rebel Marketing for budget, strategy, scope, timeline, or pause changes on your campaigns."
      />
      <ClientChangeRequestsBoard
        userId={userId}
        campaigns={campaigns}
        requests={requests}
      />
    </div>
  );
}
