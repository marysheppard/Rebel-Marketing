import { CreateApprovalForm, UpdateApprovalStatusForm } from "@/components/forms";
import { ApprovalStatusPieChart } from "@/components/Charts";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { daysBetween } from "@/lib/format";
import { canCreateApprovals, getProfile, isClientRole } from "@/lib/page-auth";
import Link from "next/link";

type ApprovalFilter =
  | "pending"
  | "changes"
  | "approved"
  | "rejected"
  | "all";

function statusForFilter(filter: ApprovalFilter): string | null {
  switch (filter) {
    case "pending":
      return "Pending";
    case "changes":
      return "Changes Requested";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return null;
  }
}

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { supabase, profile, userId } = await getProfile();
  if (!profile || !userId) return null;

  const params = await searchParams;
  const filter: ApprovalFilter =
    params.filter === "all"
      ? "all"
      : params.filter === "changes"
        ? "changes"
        : params.filter === "approved"
          ? "approved"
          : params.filter === "rejected"
            ? "rejected"
            : "pending";

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
  const targetStatus = statusForFilter(filter);
  const filtered =
    targetStatus == null
      ? list
      : list.filter((a) => a.approval_status === targetStatus);

  const isClient = isClientRole(profile.role);
  const showCreateForm = canCreateApprovals(profile.role) && !isClient;

  const pendingCount = list.filter((a) => a.approval_status === "Pending").length;
  const changesCount = list.filter(
    (a) => a.approval_status === "Changes Requested",
  ).length;
  const approvedCount = list.filter((a) => a.approval_status === "Approved").length;
  const rejectedCount = list.filter((a) => a.approval_status === "Rejected").length;

  const tabs: { id: ApprovalFilter; label: string; count: number; href: string }[] =
    [
      {
        id: "pending",
        label: "Pending",
        count: pendingCount,
        href: "/app/approvals",
      },
      {
        id: "changes",
        label: "Changes Requested",
        count: changesCount,
        href: "/app/approvals?filter=changes",
      },
      {
        id: "approved",
        label: "Approved",
        count: approvedCount,
        href: "/app/approvals?filter=approved",
      },
      {
        id: "rejected",
        label: "Rejected",
        count: rejectedCount,
        href: "/app/approvals?filter=rejected",
      },
      {
        id: "all",
        label: "All",
        count: list.length,
        href: "/app/approvals?filter=all",
      },
    ];

  const emptyCopy: Record<
    ApprovalFilter,
    { title: string; description: string }
  > = {
    pending: {
      title: "No pending approvals",
      description: "Nothing is waiting on a client decision right now.",
    },
    changes: {
      title: "No change requests",
      description: "No approvals currently need revisions.",
    },
    approved: {
      title: "No approved requests",
      description: "Approved client decisions will show up here.",
    },
    rejected: {
      title: "No rejected requests",
      description: "Rejected approvals will show up here.",
    },
    all: {
      title: "No approval requests",
      description: "Staff can request client approval on campaigns. Clients respond here.",
    },
  };

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
        <>
          <div className="mb-6 max-w-xl">
            <ApprovalStatusPieChart
              data={[
                { name: "Pending", value: pendingCount },
                { name: "Changes Requested", value: changesCount },
                { name: "Approved", value: approvedCount },
                { name: "Rejected", value: rejectedCount },
              ]}
            />
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const active = filter === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`btn btn-sm ${active ? "btn-primary" : "btn-ghost"}`}
                >
                  {tab.label}
                  <span className="badge badge-sm">{tab.count}</span>
                </Link>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title={emptyCopy[filter].title}
              description={emptyCopy[filter].description}
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
                  {filtered.map((a) => {
                    const waiting =
                      a.approval_status === "Pending"
                        ? daysBetween(a.requested_date)
                        : null;
                    return (
                      <tr key={a.id}>
                        <td>{a.requested_date}</td>
                        <td>
                          <Link
                            href={`/app/clients/${a.client_id}`}
                            className="link link-hover"
                          >
                            {(a as { clients?: { client_name: string } }).clients
                              ?.client_name ?? "—"}
                          </Link>
                        </td>
                        <td>
                          <Link
                            href={`/app/campaigns/${a.campaign_id}`}
                            className="link link-hover"
                          >
                            {(a as { campaigns?: { campaign_name: string } })
                              .campaigns?.campaign_name ?? "—"}
                          </Link>
                        </td>
                        <td>{a.approval_type}</td>
                        <td className="max-w-xs">{a.description}</td>
                        <td>
                          {waiting != null ? (
                            <span
                              className={
                                waiting >= 7
                                  ? "text-error font-medium"
                                  : waiting >= 3
                                    ? "text-warning"
                                    : ""
                              }
                            >
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
        </>
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
