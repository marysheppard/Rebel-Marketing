import Link from "next/link";
import { ApprovalNotes } from "@/components/ApprovalNotes";
import { PtoRequestForm, UpdateApprovalStatusForm } from "@/components/forms";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { remainingBalance } from "@/lib/finance";
import { money, num } from "@/lib/format";
import { getProfile, isClientRole } from "@/lib/page-auth";
import type { Campaign, Client, Invoice, PtoRequest } from "@/lib/types";

type ApprovalRow = {
  id: string;
  client_id: string;
  campaign_id: string;
  approval_type: string;
  description: string;
  requested_date: string;
  approval_status: string;
  notes?: string;
  clients?: { client_name: string } | null;
  campaigns?: { campaign_name: string } | null;
};

type AssignmentRow = {
  id: string;
  campaign_id: string;
  campaigns?: {
    id: string;
    campaign_name: string;
    campaign_status: string;
    start_date: string;
    end_date: string;
    client_id: string;
    clients?: { client_name: string } | null;
  } | null;
};

export default async function DashboardPage() {
  const { supabase, profile, userId } = await getProfile();
  if (!profile || !userId) return null;

  if (isClientRole(profile.role)) {
    return <CustomerDashboard />;
  }

  return (
    <EmployeeDashboard
      userId={userId}
      fullName={profile.full_name}
      supabase={supabase}
    />
  );
}

async function EmployeeDashboard({
  userId,
  fullName,
  supabase,
}: {
  userId: string;
  fullName: string;
  supabase: Awaited<ReturnType<typeof getProfile>>["supabase"];
}) {
  const [
    { data: managedClients },
    { data: assignments },
    { data: ptoRows },
    { data: approvalsData },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .eq("account_manager_id", userId)
      .order("client_name"),
    supabase
      .from("campaign_assignments")
      .select(
        "id, campaign_id, campaigns(id, campaign_name, campaign_status, start_date, end_date, client_id, clients(client_name))",
      )
      .eq("user_id", userId),
    supabase
      .from("pto_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("approvals").select("id, approval_status"),
  ]);

  const clients = (managedClients ?? []) as Client[];
  const myAssignments: AssignmentRow[] = (assignments ?? []).map((row) => {
    const campRaw = row.campaigns as unknown;
    const campObj = Array.isArray(campRaw)
      ? (campRaw[0] as Record<string, unknown> | undefined)
      : (campRaw as Record<string, unknown> | null | undefined);
    if (!campObj) {
      return {
        id: String(row.id),
        campaign_id: String(row.campaign_id),
        campaigns: null,
      };
    }
    const clientsRaw = campObj.clients as unknown;
    const clientObj = Array.isArray(clientsRaw)
      ? (clientsRaw[0] as { client_name?: string } | undefined)
      : (clientsRaw as { client_name?: string } | null | undefined);
    return {
      id: String(row.id),
      campaign_id: String(row.campaign_id),
      campaigns: {
        id: String(campObj.id),
        campaign_name: String(campObj.campaign_name ?? ""),
        campaign_status: String(campObj.campaign_status ?? ""),
        start_date: String(campObj.start_date ?? ""),
        end_date: String(campObj.end_date ?? ""),
        client_id: String(campObj.client_id ?? ""),
        clients: clientObj?.client_name
          ? { client_name: clientObj.client_name }
          : null,
      },
    };
  });
  const pto = (ptoRows ?? []) as PtoRequest[];
  const pendingPto = pto.filter((r) => r.status === "Pending").length;
  const pendingClientApprovals = (approvalsData ?? []).filter(
    (a) => a.approval_status === "Pending",
  ).length;
  const changesRequested = (approvalsData ?? []).filter(
    (a) => a.approval_status === "Changes Requested",
  ).length;
  const approvalsNeedingAttention = pendingClientApprovals + changesRequested;

  return (
    <div>
      <PageHeader
        title="Employee Dashboard"
        subtitle={`Welcome back, ${fullName}. Your client assignments and PTO.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assigned clients" value={String(clients.length)} />
        <StatCard
          label="Campaign assignments"
          value={String(myAssignments.length)}
        />
        <StatCard
          label="Pending PTO"
          value={String(pendingPto)}
          tone={pendingPto ? "warn" : undefined}
        />
        <StatCard
          label="Approvals needing attention"
          value={String(approvalsNeedingAttention)}
          tone={approvalsNeedingAttention ? "warn" : undefined}
        />
      </div>

      {approvalsNeedingAttention > 0 ? (
        <div className="alert mt-4 border border-warning/40 bg-warning/10 text-sm">
          <div>
            <p className="font-medium">
              {pendingClientApprovals} waiting on clients
              {changesRequested > 0
                ? ` · ${changesRequested} need staff revisions`
                : ""}
            </p>
            <p className="opacity-70">
              Review the Approval Center to track client decisions and resubmit
              when ready.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link href="/app/approvals" className="link link-primary">
                Open Approval Center
              </Link>
              {changesRequested > 0 ? (
                <Link
                  href="/app/approvals?filter=changes"
                  className="link link-primary"
                >
                  View needs changes
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold text-[#0b1f3a]">
          Client assignments
        </h2>
        {clients.length === 0 && myAssignments.length === 0 ? (
          <EmptyState
            title="No assignments yet"
            description="Clients you manage or campaigns you’re staffed on will show here."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
              <table className="table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Industry</th>
                    <th>Status</th>
                    <th>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link
                          href={`/app/clients/${c.id}`}
                          className="link link-hover font-medium"
                        >
                          {c.client_name}
                        </Link>
                      </td>
                      <td>{c.industry || "—"}</td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="text-sm opacity-80">
                        {c.contact_name || c.contact_email || "—"}
                      </td>
                    </tr>
                  ))}
                  {!clients.length ? (
                    <tr>
                      <td colSpan={4} className="opacity-60">
                        No direct client ownership assigned.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
              <table className="table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Client</th>
                    <th>Status</th>
                    <th>Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {myAssignments.map((a) => {
                    const camp = a.campaigns;
                    if (!camp) return null;
                    return (
                      <tr key={a.id}>
                        <td>
                          <Link
                            href={`/app/campaigns/${camp.id}`}
                            className="link link-hover font-medium"
                          >
                            {camp.campaign_name}
                          </Link>
                        </td>
                        <td>
                          {camp.clients?.client_name ? (
                            <Link
                              href={`/app/clients/${camp.client_id}`}
                              className="link link-hover"
                            >
                              {camp.clients.client_name}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <StatusBadge status={camp.campaign_status} />
                        </td>
                        <td className="text-sm whitespace-nowrap opacity-80">
                          {camp.start_date} → {camp.end_date}
                        </td>
                      </tr>
                    );
                  })}
                  {!myAssignments.length ? (
                    <tr>
                      <td colSpan={4} className="opacity-60">
                        No campaign staffing assignments.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-box border border-base-300 bg-base-100 p-5">
          <h2 className="mb-4 text-xl font-bold text-[#0b1f3a]">Request PTO</h2>
          <PtoRequestForm userId={userId} />
        </div>
        <div className="rounded-box border border-base-300 bg-base-100 p-5">
          <h2 className="mb-4 text-xl font-bold text-[#0b1f3a]">
            Your PTO requests
          </h2>
          {pto.length === 0 ? (
            <p className="text-sm opacity-60">No PTO requests submitted yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Dates</th>
                    <th>Hours</th>
                    <th>Status</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {pto.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap">
                        {r.start_date} → {r.end_date}
                      </td>
                      <td>{num(r.hours)}</td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="max-w-[12rem] truncate text-sm">
                        {r.reason || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

async function CustomerDashboard() {
  const { supabase, profile } = await getProfile();
  if (!profile) return null;

  const [
    { data: clientsData },
    { data: campaignsData },
    { data: invoicesData },
    { data: approvalsData },
    { data: costsData },
  ] = await Promise.all([
    supabase.from("clients").select("*").order("client_name"),
    supabase
      .from("campaigns")
      .select("*")
      .order("start_date", { ascending: false }),
    supabase.from("invoices").select("*, payments(amount)").order("due_date"),
    supabase
      .from("approvals")
      .select("*, clients(client_name), campaigns(campaign_name)")
      .order("requested_date", { ascending: false }),
    supabase.from("costs").select("campaign_id, amount"),
  ]);

  const clients = (clientsData ?? []) as Client[];
  const clientIds = new Set(clients.map((c) => c.id));
  const campaigns = ((campaignsData ?? []) as Campaign[]).filter((c) =>
    clientIds.has(c.client_id),
  );
  const invoices = ((invoicesData ?? []) as Invoice[]).filter((i) =>
    clientIds.has(i.client_id),
  );
  const approvals = ((approvalsData ?? []) as ApprovalRow[]).filter((a) =>
    clientIds.has(a.client_id),
  );
  const costsByCampaign = new Map<string, number>();
  for (const c of costsData ?? []) {
    if (!c.campaign_id) continue;
    costsByCampaign.set(
      c.campaign_id,
      (costsByCampaign.get(c.campaign_id) ?? 0) + num(c.amount),
    );
  }

  const balance = invoices.reduce((s, i) => s + remainingBalance(i), 0);
  const pending = approvals.filter((a) => a.approval_status === "Pending");
  const recentDecisions = approvals
    .filter((a) =>
      ["Approved", "Changes Requested", "Rejected"].includes(a.approval_status),
    )
    .slice(0, 8);

  return (
    <div>
      <PageHeader
        title="Customer Dashboard"
        subtitle={`Welcome, ${profile.full_name}. Track campaigns, balances, and deliverables.`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Active campaigns" value={String(
          campaigns.filter((c) => c.campaign_status === "Active").length,
        )} />
        <StatCard
          label="Account balance"
          value={money(balance)}
          tone={balance > 0 ? "warn" : "good"}
        />
        <StatCard
          label="Waiting on you"
          value={String(pending.length)}
          tone={pending.length ? "warn" : undefined}
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold text-[#0b1f3a]">
          Campaign progress
        </h2>
        {campaigns.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            description="When Rebel Marketing launches work for your account, progress will appear here."
          />
        ) : (
          <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
            <table className="table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Timeline</th>
                  <th>Budget used</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const spent = costsByCampaign.get(c.id) ?? 0;
                  const budget = num(c.campaign_budget);
                  const pctUsed =
                    budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
                  const start = new Date(c.start_date).getTime();
                  const end = new Date(c.end_date).getTime();
                  const now = Date.now();
                  const timePct =
                    end > start
                      ? Math.max(
                          0,
                          Math.min(100, Math.round(((now - start) / (end - start)) * 100)),
                        )
                      : 0;
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link
                          href={`/app/campaigns/${c.id}`}
                          className="link link-hover font-medium"
                        >
                          {c.campaign_name}
                        </Link>
                        <div className="text-xs opacity-60">{c.campaign_type}</div>
                      </td>
                      <td>
                        <StatusBadge status={c.campaign_status} />
                      </td>
                      <td className="text-sm whitespace-nowrap opacity-80">
                        {c.start_date} → {c.end_date}
                      </td>
                      <td className="text-sm">
                        {money(spent)}
                        {budget > 0 ? (
                          <span className="opacity-60"> / {money(budget)}</span>
                        ) : null}
                      </td>
                      <td className="min-w-[10rem]">
                        <div className="mb-1 flex justify-between text-xs opacity-70">
                          <span>Timeline {timePct}%</span>
                          <span>Spend {pctUsed}%</span>
                        </div>
                        <progress
                          className="progress progress-primary w-full"
                          value={timePct}
                          max={100}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-box border border-base-300 bg-base-100 p-5">
          <h2 className="mb-1 text-xl font-bold text-[#0b1f3a]">
            Account balance
          </h2>
          <p className="mb-4 text-sm opacity-70">
            Outstanding amount across open invoices.
          </p>
          <div className="mb-4 text-3xl font-bold text-[#0b1f3a]">
            {money(balance)}
          </div>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {invoices
                  .filter((i) => remainingBalance(i) > 0 || i.status !== "Paid")
                  .slice(0, 8)
                  .map((i) => (
                    <tr key={i.id}>
                      <td>{i.invoice_number}</td>
                      <td>{i.due_date}</td>
                      <td>
                        <StatusBadge status={i.status} />
                      </td>
                      <td className="text-right font-medium">
                        {money(remainingBalance(i))}
                      </td>
                    </tr>
                  ))}
                {!invoices.length ? (
                  <tr>
                    <td colSpan={4} className="opacity-60">
                      No invoices on file.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-box border border-base-300 bg-base-100 p-5">
          <h2 className="mb-1 text-xl font-bold text-[#0b1f3a]">
            Waiting on you
          </h2>
          <p className="mb-4 text-sm opacity-70">
            Decisions Rebel Marketing needs from you before work can move forward.
          </p>
          {pending.length === 0 ? (
            <p className="text-sm opacity-60">
              You’re all caught up — nothing is waiting on your decision.
            </p>
          ) : (
            <ul className="space-y-4">
              {pending.map((a) => {
                const notes = String(a.notes ?? "").trim();
                return (
                  <li
                    key={a.id}
                    className="rounded-xl border border-[#0b1f3a14] bg-[#f7f9fc] p-4"
                  >
                    <div className="mb-1 text-sm font-semibold text-[#0b1f3a]">
                      {a.campaigns?.campaign_name ?? "Campaign"}
                    </div>
                    <div className="mb-1 text-xs uppercase tracking-wide opacity-60">
                      {a.approval_type} · requested {a.requested_date}
                    </div>
                    <p className="mb-2 text-sm">{a.description}</p>
                    <ApprovalNotes notes={notes} />
                    <div className="mt-3">
                      <UpdateApprovalStatusForm
                        approvalId={a.id}
                        currentStatus={a.approval_status}
                        currentNotes={notes}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 text-sm">
            <Link href="/app/approvals" className="link link-primary">
              Open full approval center
            </Link>
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-xl font-bold text-[#0b1f3a]">
          Recent decisions
        </h2>
        <p className="mb-3 text-sm opacity-70">
          Your past approvals, change requests, and rejections.
        </p>
        {recentDecisions.length === 0 ? (
          <p className="text-sm opacity-60">
            No past decisions yet. After you approve, reject, or request changes,
            history will show here.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
            <table className="table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {recentDecisions.map((a) => {
                  const notes = String(a.notes ?? "").trim();
                  return (
                    <tr key={a.id}>
                      <td className="font-medium">
                        {a.campaigns?.campaign_name ?? "Campaign"}
                      </td>
                      <td>{a.approval_type}</td>
                      <td>
                        <StatusBadge status={a.approval_status} />
                      </td>
                      <td className="text-sm opacity-70">{a.requested_date}</td>
                      <td className="max-w-sm">
                        {notes ? (
                          <ApprovalNotes notes={notes} compact />
                        ) : (
                          <span className="opacity-50">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
