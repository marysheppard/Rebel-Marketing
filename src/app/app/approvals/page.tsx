import {
  CreateApprovalForm,
  ResubmitApprovalForm,
  UpdateApprovalStatusForm,
} from "@/components/forms";
import { ApprovalNotes } from "@/components/ApprovalNotes";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { daysBetween } from "@/lib/format";
import { canCreateApprovals, getProfile, isClientRole } from "@/lib/page-auth";
import Link from "next/link";

type ApprovalFilter = "pending" | "changes" | "all";

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
  const filtered = list.filter((a) => {
    if (filter === "pending") return a.approval_status === "Pending";
    if (filter === "changes") return a.approval_status === "Changes Requested";
    return true;
  });

  const isClient = isClientRole(profile.role);
  const showCreateForm = canCreateApprovals(profile.role) && !isClient;
  const pendingCount = list.filter((a) => a.approval_status === "Pending").length;
  const changesCount = list.filter(
    (a) => a.approval_status === "Changes Requested",
  ).length;

  const tabs: { id: ApprovalFilter; label: string; count: number }[] = [
    { id: "pending", label: "Pending", count: pendingCount },
    { id: "changes", label: "Needs changes", count: changesCount },
    { id: "all", label: "All", count: list.length },
  ];

  const filterEmpty =
    filter === "pending"
      ? {
          title: "Nothing waiting on a client decision",
          description:
            "When staff send a request, pending items will show here until the client responds.",
        }
      : filter === "changes"
        ? {
            title: "No change requests right now",
            description:
              "Items where the client asked for revisions will appear in this view.",
          }
        : {
            title: "No requests in this view",
            description: "Try another filter to see more approval requests.",
          };

  return (
    <div>
      <PageHeader
        title="Approval Center"
        subtitle="Client sign-off on creative, budget, and launch decisions"
      />

      {list.length === 0 ? (
        <EmptyState
          title="No approval requests yet"
          description="Staff can request client approval on campaigns. Clients review and respond here."
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const active = filter === tab.id;
              const href =
                tab.id === "pending"
                  ? "/app/approvals"
                  : `/app/approvals?filter=${tab.id}`;
              return (
                <Link
                  key={tab.id}
                  href={href}
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
              title={filterEmpty.title}
              description={filterEmpty.description}
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const waiting =
                      a.approval_status === "Pending"
                        ? daysBetween(a.requested_date)
                        : null;
                    const clientName =
                      (a as { clients?: { client_name: string } }).clients
                        ?.client_name ?? "—";
                    const notes = String(a.notes ?? "").trim();
                    return (
                      <tr key={a.id}>
                        <td>{a.requested_date}</td>
                        <td>
                          {isClient ? (
                            <span>{clientName}</span>
                          ) : (
                            <Link
                              href={`/app/clients/${a.client_id}`}
                              className="link link-hover"
                            >
                              {clientName}
                            </Link>
                          )}
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
                        <td className="max-w-xs">
                          <div>{a.description}</div>
                          <ApprovalNotes notes={notes} />
                        </td>
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
                        <td className="min-w-[14rem]">
                          {isClient ? (
                            <UpdateApprovalStatusForm
                              approvalId={a.id}
                              currentStatus={a.approval_status}
                              currentNotes={notes}
                            />
                          ) : (
                            <ResubmitApprovalForm
                              approvalId={a.id}
                              currentStatus={a.approval_status}
                              currentNotes={notes}
                            />
                          )}
                        </td>
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
