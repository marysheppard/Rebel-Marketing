import Link from "next/link";
import {
  AccountManagerDashboard,
  AgencyExecutiveDashboard,
} from "@/components/dashboards/RoleDashboards";
import { UpdateApprovalStatusForm } from "@/components/forms";
import { PtoRequestForm } from "@/components/PtoRequestForm";
import { NamedBarChart } from "@/components/tasks/NamedBarChart";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { TaskStatusChart } from "@/components/tasks/TaskStatusChart";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { remainingBalance } from "@/lib/finance";
import { money, num } from "@/lib/format";
import { getProfile, isClientRole } from "@/lib/page-auth";
import { toDateStr } from "@/lib/time";
import type {
  Campaign,
  Client,
  Invoice,
  Profile,
  PtoRequest,
  Task,
} from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";

type ApprovalRow = {
  id: string;
  client_id: string;
  campaign_id: string;
  approval_type: string;
  description: string;
  requested_date: string;
  approval_status: string;
  clients?: { client_name: string } | null;
  campaigns?: { campaign_name: string } | null;
};

export default async function DashboardPage() {
  const { supabase, profile, userId } = await getProfile();
  if (!profile || !userId) return null;

  if (isClientRole(profile.role)) {
    return <CustomerDashboard />;
  }

  if (profile.role === "account_manager") {
    return (
      <AccountManagerDashboard
        userId={userId}
        profile={profile}
        supabase={supabase}
      />
    );
  }

  if (profile.role === "agency_manager") {
    return (
      <AgencyExecutiveDashboard
        userId={userId}
        profile={profile}
        supabase={supabase}
      />
    );
  }

  return (
    <EmployeeDashboard
      userId={userId}
      profile={profile}
      supabase={supabase}
    />
  );
}

async function EmployeeDashboard({
  userId,
  profile,
  supabase,
}: {
  userId: string;
  profile: Profile;
  supabase: Awaited<ReturnType<typeof getProfile>>["supabase"];
}) {
  const today = new Date();
  const todayStr = toDateStr(today);

  const [
    { data: taskRows },
    { data: ptoRows },
    { data: assignmentRows },
    { data: approvalRows },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, status, due_date, priority, estimated_hours, actual_hours, campaigns(campaign_name, clients(client_name))",
      )
      .eq("assignee_id", userId)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("pto_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("campaign_assignments")
      .select(
        "id, campaigns(id, campaign_name, campaign_status, start_date, end_date, clients(client_name))",
      )
      .eq("user_id", userId),
    supabase
      .from("approvals")
      .select(
        "id, approval_type, approval_status, requested_date, description, campaigns(campaign_name), clients(client_name)",
      )
      .order("requested_date", { ascending: false })
      .limit(8),
  ]);

  const tasks = (taskRows ?? []) as unknown as Task[];
  const pto = (ptoRows ?? []) as PtoRequest[];

  const completed = tasks.filter((t) => t.status === "Completed").length;
  const openTasks = tasks.filter((t) => t.status !== "Completed");
  const overdueTasks = openTasks.filter(
    (t) => t.due_date && t.due_date < todayStr,
  );
  const overdueIds = new Set(overdueTasks.map((t) => t.id));
  const inProgressOnTrack = openTasks.filter(
    (t) => t.status === "In Progress" && !overdueIds.has(t.id),
  ).length;
  const notStartedOnTrack = openTasks.filter(
    (t) => t.status === "Not Started" && !overdueIds.has(t.id),
  ).length;

  const taskMix = [
    { name: "Not Started", value: notStartedOnTrack },
    { name: "In Progress", value: inProgressOnTrack },
    { name: "Completed", value: completed },
    { name: "Overdue", value: overdueTasks.length },
  ];

  const priorityOrder = ["Urgent", "High", "Medium", "Low"] as const;
  const priorityChart = priorityOrder.map((name) => ({
    name,
    value: openTasks.filter((t) => t.priority === name).length,
  }));

  const byClient = new Map<string, number>();
  for (const t of openTasks) {
    const client = t.campaigns?.clients?.client_name || "Unassigned";
    byClient.set(client, (byClient.get(client) ?? 0) + 1);
  }
  const clientWorkload = [...byClient.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const attentionTasks = [...openTasks]
    .sort((a, b) => {
      const aOver = a.due_date && a.due_date < todayStr ? 0 : 1;
      const bOver = b.due_date && b.due_date < todayStr ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      const pr = (p: string) =>
        priorityOrder.indexOf(p as (typeof priorityOrder)[number]);
      const pDiff = pr(a.priority) - pr(b.priority);
      if (pDiff !== 0) return pDiff;
      return (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
    })
    .slice(0, 10);

  const campaigns = (assignmentRows ?? [])
    .map((row) => {
      const campRaw = row.campaigns as unknown;
      const camp = Array.isArray(campRaw) ? campRaw[0] : campRaw;
      if (!camp || typeof camp !== "object") return null;
      const c = camp as {
        id?: string;
        campaign_name?: string;
        campaign_status?: string;
        start_date?: string;
        end_date?: string;
        clients?: { client_name?: string } | { client_name?: string }[] | null;
      };
      const clientsRaw = c.clients;
      const clientObj = Array.isArray(clientsRaw) ? clientsRaw[0] : clientsRaw;
      return {
        id: String(c.id ?? ""),
        campaign_name: String(c.campaign_name ?? ""),
        campaign_status: String(c.campaign_status ?? ""),
        start_date: String(c.start_date ?? ""),
        end_date: String(c.end_date ?? ""),
        client_name: clientObj?.client_name ?? "—",
      };
    })
    .filter(Boolean) as {
    id: string;
    campaign_name: string;
    campaign_status: string;
    start_date: string;
    end_date: string;
    client_name: string;
  }[];

  const assignedCampaignIds = campaigns.map((c) => c.id).filter(Boolean);
  const { data: metricRows } =
    assignedCampaignIds.length > 0
      ? await supabase
          .from("campaign_metrics")
          .select("campaign_id, clicks, impressions, metric_date")
          .in("campaign_id", assignedCampaignIds)
      : { data: [] as { campaign_id: string; clicks: number; impressions: number; metric_date: string }[] };

  const metricsByCampaign = new Map<
    string,
    { clicks: number; impressions: number; minDate: string; maxDate: string }
  >();
  for (const row of metricRows ?? []) {
    const prev = metricsByCampaign.get(row.campaign_id) ?? {
      clicks: 0,
      impressions: 0,
      minDate: row.metric_date,
      maxDate: row.metric_date,
    };
    prev.clicks += num(row.clicks);
    prev.impressions += num(row.impressions);
    if (row.metric_date < prev.minDate) prev.minDate = row.metric_date;
    if (row.metric_date > prev.maxDate) prev.maxDate = row.metric_date;
    metricsByCampaign.set(row.campaign_id, prev);
  }

  const clickRows = campaigns
    .map((c) => {
      const m = metricsByCampaign.get(c.id);
      if (!m) return null;
      return {
        id: c.id,
        campaign_name: c.campaign_name,
        client_name: c.client_name,
        clicks: m.clicks,
        impressions: m.impressions,
        ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
      };
    })
    .filter(Boolean) as {
    id: string;
    campaign_name: string;
    client_name: string;
    clicks: number;
    impressions: number;
    ctr: number;
  }[];

  clickRows.sort((a, b) => b.clicks - a.clicks);
  const clicksChart = clickRows.map((r) => ({
    name: r.campaign_name,
    value: r.clicks,
  }));
  const totalClicks = clickRows.reduce((s, r) => s + r.clicks, 0);
  const metricDates = [...metricsByCampaign.values()];
  const metricRangeLabel =
    metricDates.length === 0
      ? null
      : (() => {
          const mins = metricDates.map((m) => m.minDate).sort();
          const maxs = metricDates.map((m) => m.maxDate).sort();
          const from = mins[0];
          const to = maxs[maxs.length - 1];
          return from === to ? from : `${from} → ${to}`;
        })();

  const approvals = (approvalRows ?? []) as unknown as ApprovalRow[];
  const pendingApprovals = approvals.filter(
    (a) => a.approval_status === "Pending",
  );

  const allWorkspaceLinks = [
    {
      href: "/app/tasks",
      label: "My Tasks",
      blurb: "Update status, notes, mark complete",
      roles: ["agency_manager", "account_manager", "marketing", "billing"] as const,
    },
    {
      href: "/app/time",
      label: "Time Entry",
      blurb: "Log hours on tasks",
      roles: ["agency_manager", "account_manager", "marketing", "billing"] as const,
    },
    {
      href: "/app/campaigns",
      label: "Campaigns",
      blurb: "Client delivery and budgets",
      roles: ["agency_manager", "account_manager", "marketing"] as const,
    },
    {
      href: "/app/approvals",
      label: "Approvals",
      blurb: "Client sign-off queue",
      roles: ["agency_manager", "account_manager", "marketing"] as const,
    },
    {
      href: "/app/clients",
      label: "Clients",
      blurb: "Accounts and contacts",
      roles: ["agency_manager", "account_manager", "billing"] as const,
    },
    {
      href: "/app/contracts",
      label: "Contracts",
      blurb: "Agreements and scope",
      roles: ["agency_manager", "account_manager", "billing"] as const,
    },
    {
      href: "/app/work",
      label: "Work",
      blurb: "Campaign activity log",
      roles: ["agency_manager", "account_manager"] as const,
    },
    {
      href: "/app/costs",
      label: "Costs",
      blurb: "Spend and budget variance",
      roles: ["agency_manager", "account_manager"] as const,
    },
    {
      href: "/app/billing",
      label: "Billing",
      blurb: "Invoices and drafts",
      roles: ["agency_manager", "billing"] as const,
    },
    {
      href: "/app/ar",
      label: "Accounts Receivable",
      blurb: "Balances and collections",
      roles: ["agency_manager", "billing"] as const,
    },
    {
      href: "/app/profitability",
      label: "Profitability",
      blurb: "Client and campaign margins",
      roles: ["agency_manager", "account_manager"] as const,
    },
    {
      href: "/app/metrics",
      label: "Marketing Metrics",
      blurb: "CAC, ROI, ROAS, CTR",
      roles: ["agency_manager", "account_manager"] as const,
    },
    {
      href: "/app/alerts",
      label: "Alerts",
      blurb: "Portfolio exceptions",
      roles: ["account_manager"] as const,
    },
    {
      href: "/app/accounting",
      label: "Revenue & Accounting",
      blurb: "Recognition and deferred",
      roles: ["agency_manager"] as const,
    },
    {
      href: "/app/employees",
      label: "Employees",
      blurb: "Staff utilization",
      roles: ["agency_manager"] as const,
    },
    {
      href: "/app/reports",
      label: "Reports",
      blurb: "Profitability charts",
      roles: ["agency_manager", "account_manager", "billing"] as const,
    },
  ];
  const workspaceLinks = allWorkspaceLinks.filter((l) =>
    (l.roles as readonly string[]).includes(profile.role),
  );

  const initials = profile.full_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const todayLabel = `${weekdays[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

  return (
    <div>
      <PageHeader
        title="Employee Dashboard"
        subtitle={`${todayLabel} · Client work overview`}
      />

      <div className="mb-6 overflow-hidden rounded-box border border-base-300 bg-gradient-to-br from-base-100 via-base-100 to-primary/5 p-5">
        <div className="flex flex-wrap items-center gap-4">
          {profile.profile_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profile_image}
              alt=""
              className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/20"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-xl font-bold text-primary ring-2 ring-primary/20">
              {initials || "?"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-bold tracking-tight">
              {profile.full_name}
            </div>
            <div className="mt-0.5 text-sm opacity-70">
              {ROLE_LABELS[profile.role]}
              {profile.department ? ` · ${profile.department}` : ""}
            </div>
          </div>
          <Link href="/app/tasks" className="btn btn-primary btn-sm">
            Open My Tasks
          </Link>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <TaskStatusChart data={taskMix} title="Task mix" />
        <NamedBarChart
          title="Open tasks by priority"
          data={priorityChart}
          color="#f59e0b"
        />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">What needs doing</h3>
          <Link href="/app/tasks" className="link link-hover text-sm">
            All tasks
          </Link>
        </div>
        {attentionTasks.length === 0 ? (
          <EmptyState
            title="No open client tasks"
            description="When work is assigned to you, overdue and upcoming items will show here."
            actionHref="/app/tasks"
            actionLabel="Go to My Tasks"
          />
        ) : (
          <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Client</th>
                  <th>Campaign</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {attentionTasks.map((t) => {
                  const overdue = Boolean(t.due_date && t.due_date < todayStr);
                  return (
                    <tr
                      key={t.id}
                      className={overdue ? "bg-error/5" : undefined}
                    >
                      <td className="font-medium">{t.title}</td>
                      <td>{t.campaigns?.clients?.client_name ?? "—"}</td>
                      <td className="text-sm opacity-80">
                        {t.campaigns?.campaign_name ?? "—"}
                      </td>
                      <td>
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="whitespace-nowrap text-sm">
                        {t.due_date ?? "—"}
                        {overdue ? (
                          <span className="badge badge-error badge-xs ml-1">
                            Overdue
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Clicks on your campaigns</h3>
          {metricRangeLabel ? (
            <span className="text-sm opacity-60">{metricRangeLabel}</span>
          ) : null}
        </div>
        {assignedCampaignIds.length === 0 ? (
          <EmptyState
            title="No assigned campaigns"
            description="When you are staffed on a campaign, click performance for that work will show here."
            actionHref="/app/campaigns"
            actionLabel="View campaigns"
          />
        ) : clickRows.length === 0 ? (
          <EmptyState
            title="No click metrics yet"
            description="Metrics will appear once campaign performance data is logged for your assigned work."
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            <NamedBarChart
              title="Clicks by campaign"
              data={clicksChart}
              color="#22c55e"
            />
            <div className="rounded-box border border-base-300 bg-base-100 p-4">
              <h3 className="mb-3 font-semibold">Performance detail</h3>
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Client</th>
                      <th className="text-right">Clicks</th>
                      <th className="text-right">Impressions</th>
                      <th className="text-right">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clickRows.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <Link
                            href={`/app/campaigns/${r.id}`}
                            className="link link-hover font-medium"
                          >
                            {r.campaign_name}
                          </Link>
                        </td>
                        <td>{r.client_name}</td>
                        <td className="text-right font-medium">
                          {r.clicks.toLocaleString()}
                        </td>
                        <td className="text-right">
                          {r.impressions.toLocaleString()}
                        </td>
                        <td className="text-right">{r.ctr.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm opacity-70">
                Total clicks on your campaigns:{" "}
                <span className="font-semibold text-base-content">
                  {totalClicks.toLocaleString()}
                </span>
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <div>
          <NamedBarChart
            title="Open work by client"
            data={clientWorkload}
            color="#38bdf8"
          />
        </div>
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Your client campaigns</h3>
            <Link href="/app/campaigns" className="link link-hover text-sm">
              Campaigns
            </Link>
          </div>
          {campaigns.length === 0 ? (
            <p className="text-sm opacity-60">
              No campaign staffing assignments yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Campaign</th>
                    <th>Status</th>
                    <th>Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <td>{c.client_name}</td>
                      <td>
                        <Link
                          href={`/app/campaigns/${c.id}`}
                          className="link link-hover font-medium"
                        >
                          {c.campaign_name}
                        </Link>
                      </td>
                      <td>
                        <StatusBadge status={c.campaign_status} />
                      </td>
                      <td className="whitespace-nowrap text-xs opacity-70">
                        {c.start_date} → {c.end_date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-box border border-base-300 bg-base-100 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Client approvals</h3>
          <Link href="/app/approvals" className="link link-hover text-sm">
            Approvals
          </Link>
        </div>
        {approvals.length === 0 ? (
          <p className="text-sm opacity-60">No approval requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Requested</th>
                  <th>Client</th>
                  <th>Campaign</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((a) => (
                  <tr
                    key={a.id}
                    className={
                      a.approval_status === "Pending" ? "bg-warning/5" : undefined
                    }
                  >
                    <td className="whitespace-nowrap">{a.requested_date}</td>
                    <td>{a.clients?.client_name ?? "—"}</td>
                    <td>{a.campaigns?.campaign_name ?? "—"}</td>
                    <td className="text-sm">{a.approval_type}</td>
                    <td>
                      <StatusBadge status={a.approval_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pendingApprovals.length > 0 ? (
          <p className="mt-3 text-sm opacity-70">
            {pendingApprovals.length} waiting on client decision.
          </p>
        ) : null}
      </section>

      <section className="mt-8">
        <h3 className="mb-3 font-semibold">Workspace</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workspaceLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-box border border-base-300 bg-base-100 p-4 transition hover:border-primary/40 hover:shadow-sm"
            >
              <div className="font-semibold">{l.label}</div>
              <p className="mt-1 text-sm opacity-70">{l.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <details className="mt-10 rounded-box border border-base-300 bg-base-100">
        <summary className="cursor-pointer px-5 py-4 font-semibold">
          PTO
        </summary>
        <div className="grid gap-6 border-t border-base-300 p-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 font-semibold">Request PTO</h3>
            <PtoRequestForm userId={userId} />
          </div>
          <div>
            <h3 className="mb-3 font-semibold">Your requests</h3>
            {pto.length === 0 ? (
              <p className="text-sm opacity-60">No PTO requests yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Dates</th>
                      <th>Hours</th>
                      <th>Status</th>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </details>
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

  return (
    <div>
      <PageHeader
        title="Customer Dashboard"
        subtitle={`Welcome, ${profile.full_name}. Track campaigns, balances, and deliverables.`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Active campaigns"
          value={String(
            campaigns.filter((c) => c.campaign_status === "Active").length,
          )}
        />
        <StatCard
          label="Account balance"
          value={money(balance)}
          tone={balance > 0 ? "warn" : "good"}
        />
        <StatCard
          label="Deliverables awaiting decision"
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
                    budget > 0
                      ? Math.min(100, Math.round((spent / budget) * 100))
                      : 0;
                  const start = new Date(c.start_date).getTime();
                  const end = new Date(c.end_date).getTime();
                  const now = Date.now();
                  const timePct =
                    end > start
                      ? Math.max(
                          0,
                          Math.min(
                            100,
                            Math.round(((now - start) / (end - start)) * 100),
                          ),
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
            Approve or reject deliverables
          </h2>
          <p className="mb-4 text-sm opacity-70">
            Review creative and campaign deliverables waiting on your decision.
          </p>
          {pending.length === 0 ? (
            <p className="text-sm opacity-60">
              Nothing waiting for approval right now.
            </p>
          ) : (
            <ul className="space-y-4">
              {pending.map((a) => (
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
                  <p className="mb-3 text-sm">{a.description}</p>
                  <UpdateApprovalStatusForm
                    approvalId={a.id}
                    currentStatus={a.approval_status}
                  />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm">
            <Link href="/app/approvals" className="link link-primary">
              Open full approval center
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
