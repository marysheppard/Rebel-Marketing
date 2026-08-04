import { CreateApprovalForm, UpdateApprovalStatusForm } from "@/components/forms";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { daysBetween } from "@/lib/format";
import { canCreateApprovals, getProfile, isClientRole } from "@/lib/page-auth";
import Link from "next/link";

export default async function ApprovalsPage() {
  const { supabase, profile, userId } = await getProfile();
  if (!profile || !userId) return null;

  const [{ data: approvals }, { data: campaigns }] = await Promise.all([
    supabase
      .from("approvals")
      .select("*, clients(client_name), campaigns(campaign_name)")
      .order("requested_date", { ascending: false }),
    supabase
      .from("campaigns")
      .select("id, campaign_name, client_id")
      .in("campaign_status", ["Active", "Late", "On Hold"])
      .order("campaign_name"),
  ]);

  const list = approvals ?? [];
  const isClient = isClientRole(profile.role);
  const showCreateForm = canCreateApprovals(profile.role) && !isClient;

  return (
    <div>
      <PageHeader
        title="Approval Center"
        subtitle="Client sign-off on creative, budget, and launch decisions"
      />

      {list.length === 0 ? (
        <EmptyState
          title="No approval requests"
          description="Staff can request client approval on campaigns. Clients respond here."
        />
      ) : (
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table">
            <thead>
              <tr>
                <th>Requested</th>
                <th>Client</th>
                <th>Campaign</th>
                <th>Type</th>
                <th>Description</th>
                <th>Days waiting</th>
                <th>Status</th>
                {isClient ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {list.map((a) => {
                const waiting =
                  a.approval_status === "Pending"
                    ? daysBetween(a.requested_date)
                    : null;
                return (
                  <tr key={a.id}>
                    <td>{a.requested_date}</td>
                    <td>
                      <Link href={`/app/clients/${a.client_id}`} className="link link-hover">
                        {(a as { clients?: { client_name: string } }).clients?.client_name ?? "—"}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/app/campaigns/${a.campaign_id}`} className="link link-hover">
                        {(a as { campaigns?: { campaign_name: string } }).campaigns?.campaign_name ?? "—"}
                      </Link>
                    </td>
                    <td>{a.approval_type}</td>
                    <td className="max-w-xs">{a.description}</td>
                    <td>
                      {waiting != null ? (
                        <span className={waiting >= 7 ? "text-error font-medium" : waiting >= 3 ? "text-warning" : ""}>
                          {waiting}d
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <StatusBadge status={a.approval_status} />
                    </td>
                    {isClient ? (
                      <td>
                        <UpdateApprovalStatusForm
                          approvalId={a.id}
                          currentStatus={a.approval_status}
                        />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreateForm ? (
        <section className="mt-8 rounded-box border border-base-300 bg-base-100 p-6">
          <h2 className="mb-4 text-xl font-bold">Request approval</h2>
          <CreateApprovalForm
            userId={userId}
            campaigns={(campaigns ?? []).map((c) => ({
              id: c.id,
              label: c.campaign_name,
              client_id: c.client_id,
            }))}
          />
        </section>
      ) : null}
    </div>
  );
}
