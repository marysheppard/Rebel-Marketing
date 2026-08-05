import Link from "next/link";
import { ClicksByCampaignChart } from "@/components/Charts";
import { ClientMapDynamic } from "@/components/ClientMapDynamic";
import { DashboardCalendar } from "@/components/DashboardCalendar";
import { UpdateApprovalStatusForm } from "@/components/forms";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { WelcomeMessage } from "@/components/WelcomeMessage";
import { remainingBalance } from "@/lib/finance";
import { money, num } from "@/lib/format";
import { getProfile, isClientRole, isMarketingRole } from "@/lib/page-auth";
import type { Campaign, Client, Invoice, Profile } from "@/lib/types";

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

  if (!isMarketingRole(profile.role)) {
    return (
      <div>
        <PageHeader
          title={`Welcome, ${profile.full_name}`}
          subtitle="Your role workspace is managed separately and will ship in a later update."
        />
        <EmptyState
          title="Staff dashboard coming soon"
          description="This branch delivers the Marketing employee experience (EMP-1003). Manager, billing, and account-manager dashboards are owned by other workstreams."
        />
      </div>
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
  const todayStr = today.toISOString().slice(0, 10);

  const [
    { data: managedClients },
    { data: assignments },
    { data: taskRows },
    { data: eventRows },
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
      .from("tasks")
      .select(
        "id, title, due_date, status, priority, campaign_id, campaigns(campaign_name, client_id, clients(client_name))",
      )
      .eq("assignee_id", userId)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("calendar_events")
      .select("id, title, event_date, clients(client_name)")
      .eq("user_id", userId)
      .order("event_date", { ascending: true }),
  ]);

  const assignedCampaignIds = [
    ...new Set((assignments ?? []).map((a) => String(a.campaign_id))),
  ];

  const { data: metricRows } =
    assignedCampaignIds.length > 0
      ? await supabase
          .from("campaign_metrics")
          .select("campaign_id, metric_date, impressions, clicks, conversions, spend")
          .in("campaign_id", assignedCampaignIds)
          .order("metric_date", { ascending: true })
      : { data: [] as {
          campaign_id: string;
          metric_date: string;
          impressions: number;
          clicks: number;
          conversions: number;
          spend: number;
        }[] };

  const ownedClients = (managedClients ?? []) as Client[];
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

  type DashTask = {
    id: string;
    title: string;
    due_date: string | null;
    status: string;
    priority: string;
    campaign_id: string;
    client_id: string;
    campaign_name: string;
    client_name: string;
  };

  const tasks: DashTask[] = (taskRows ?? []).map((t) => {
    const campRaw = t.campaigns as unknown;
    const campObj = Array.isArray(campRaw)
      ? (campRaw[0] as Record<string, unknown> | undefined)
      : (campRaw as Record<string, unknown> | null | undefined);
    const clientsRaw = campObj?.clients as unknown;
    const clientObj = Array.isArray(clientsRaw)
      ? (clientsRaw[0] as { client_name?: string } | undefined)
      : (clientsRaw as { client_name?: string } | null | undefined);
    return {
      id: String(t.id),
      title: String(t.title),
      due_date: t.due_date ? String(t.due_date) : null,
      status: String(t.status),
      priority: String(t.priority ?? "Medium"),
      campaign_id: String(t.campaign_id),
      client_id: String(campObj?.client_id ?? ""),
      campaign_name: String(campObj?.campaign_name ?? "—"),
      client_name: clientObj?.client_name ?? "—",
    };
  });

  const priorityRank: Record<string, number> = {
    Urgent: 0,
    High: 1,
    Medium: 2,
    Low: 3,
  };

  const openTasks = tasks
    .filter((t) => t.status !== "Approved")
    .sort((a, b) => {
      const pa = priorityRank[a.priority] ?? 99;
      const pb = priorityRank[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      const da = a.due_date ?? "9999-99-99";
      const db = b.due_date ?? "9999-99-99";
      return da.localeCompare(db);
    });
  const overdueTasks = openTasks.filter(
    (t) =>
      t.due_date &&
      t.due_date < todayStr &&
      t.status !== "Submitted" &&
      t.status !== "Approved",
  );
  const awaitingApproval = tasks.filter((t) => t.status === "Submitted");

  type WorkingCampaign = {
    id: string;
    name: string;
    status: string;
    end_date: string;
  };

  type WorkingClient = {
    id: string;
    name: string;
    status: string | null;
    campaigns: WorkingCampaign[];
    openCount: number;
    overdueCount: number;
  };

  const workingMap = new Map<string, WorkingClient>();

  function ensureClient(
    id: string,
    name: string,
    status: string | null = null,
  ) {
    if (!id) return null;
    let row = workingMap.get(id);
    if (!row) {
      row = {
        id,
        name: name || "—",
        status,
        campaigns: [],
        openCount: 0,
        overdueCount: 0,
      };
      workingMap.set(id, row);
    } else {
      if (name && row.name === "—") row.name = name;
      if (status && !row.status) row.status = status;
    }
    return row;
  }

  for (const c of ownedClients) {
    ensureClient(c.id, c.client_name, c.status);
  }

  for (const a of myAssignments) {
    const camp = a.campaigns;
    if (!camp?.client_id) continue;
    const row = ensureClient(
      camp.client_id,
      camp.clients?.client_name ?? "—",
    );
    if (!row) continue;
    if (!row.campaigns.some((x) => x.id === camp.id)) {
      row.campaigns.push({
        id: camp.id,
        name: camp.campaign_name,
        status: camp.campaign_status,
        end_date: camp.end_date,
      });
    }
  }

  for (const t of openTasks) {
    if (!t.client_id) continue;
    const row = ensureClient(t.client_id, t.client_name);
    if (!row) continue;
    row.openCount += 1;
    if (
      t.due_date &&
      t.due_date < todayStr &&
      t.status !== "Submitted" &&
      t.status !== "Approved"
    ) {
      row.overdueCount += 1;
    }
  }

  const workingClients = [...workingMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const workingIds = workingClients.map((c) => c.id);
  const { data: locationRows } =
    workingIds.length > 0
      ? await supabase
          .from("clients")
          .select("id, city, state, latitude, longitude")
          .in("id", workingIds)
      : {
          data: [] as {
            id: string;
            city: string;
            state: string;
            latitude: number | null;
            longitude: number | null;
          }[],
        };

  const locationById = new Map(
    (locationRows ?? []).map((r) => [r.id as string, r]),
  );

  const mapMarkers = workingClients
    .map((c) => {
      const loc = locationById.get(c.id);
      const lat = loc?.latitude != null ? Number(loc.latitude) : NaN;
      const lng = loc?.longitude != null ? Number(loc.longitude) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        id: c.id,
        name: c.name,
        lat,
        lng,
        city: loc?.city || undefined,
        state: loc?.state || undefined,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m != null);

  const missingMapCount = workingClients.length - mapMarkers.length;

  const calendarTasks = openTasks
    .filter((t) => t.due_date)
    .map((t) => ({
      id: t.id,
      title: t.title,
      date: t.due_date as string,
      overdue: Boolean(
        t.due_date &&
          t.due_date < todayStr &&
          t.status !== "Submitted" &&
          t.status !== "Approved",
      ),
    }));

  const calendarCampaigns = myAssignments
    .filter((a) => a.campaigns?.end_date)
    .map((a) => ({
      id: a.campaigns!.id,
      title: a.campaigns!.campaign_name,
      date: a.campaigns!.end_date,
    }));

  const calendarEvents = (eventRows ?? []).map((ev) => {
    const clientsRaw = ev.clients as unknown;
    const clientObj = Array.isArray(clientsRaw)
      ? (clientsRaw[0] as { client_name?: string } | undefined)
      : (clientsRaw as { client_name?: string } | null | undefined);
    return {
      id: String(ev.id),
      title: String(ev.title),
      date: String(ev.event_date),
      client_name: clientObj?.client_name ?? null,
    };
  });

  const campaignNameById = new Map<string, string>();
  for (const a of myAssignments) {
    if (a.campaigns) {
      campaignNameById.set(a.campaigns.id, a.campaigns.campaign_name);
    }
  }

  const totalsByCampaign = new Map<
    string,
    { name: string; clicks: number }
  >();

  for (const m of metricRows ?? []) {
    const cid = String(m.campaign_id);
    const name = campaignNameById.get(cid) ?? "Campaign";
    const prev = totalsByCampaign.get(cid) ?? { name, clicks: 0 };
    prev.clicks += num(m.clicks);
    totalsByCampaign.set(cid, prev);
  }

  const clicksByCampaign = [...totalsByCampaign.values()]
    .map((r) => ({ name: r.name, clicks: r.clicks }))
    .sort((a, b) => b.clicks - a.clicks);

  const hasPerformance = clicksByCampaign.length > 0;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${profile.full_name}`}
        subtitle={<WelcomeMessage />}
      />

      {(overdueTasks.length > 0 || awaitingApproval.length > 0) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {overdueTasks.length > 0 ? (
            <span className="badge badge-error badge-outline">
              {overdueTasks.length} overdue task
              {overdueTasks.length === 1 ? "" : "s"}
            </span>
          ) : null}
          {awaitingApproval.length > 0 ? (
            <span className="badge badge-warning badge-outline">
              {awaitingApproval.length} awaiting approval
            </span>
          ) : null}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Clients you're on"
          value={String(workingClients.length)}
        />
        <StatCard
          label="Open tasks"
          value={String(openTasks.length)}
          tone={overdueTasks.length ? "warn" : undefined}
        />
        <StatCard
          label="Overdue tasks"
          value={String(overdueTasks.length)}
          tone={overdueTasks.length ? "warn" : undefined}
        />
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-xl font-bold text-[#0b1f3a]">Pressing tasks</h2>
            <Link href="/app/tasks" className="link link-hover text-sm">
              View all
            </Link>
          </div>
          {openTasks.length === 0 ? (
            <EmptyState
              title="No open tasks"
              description="Your highest-priority work will show up here."
            />
          ) : (
            <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Due</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {openTasks.slice(0, 3).map((t) => {
                    const overdue =
                      t.due_date &&
                      t.due_date < todayStr &&
                      t.status !== "Submitted";
                    return (
                      <tr key={t.id}>
                        <td>
                          <Link
                            href={`/app/tasks/${t.id}`}
                            className="link link-hover font-medium"
                          >
                            {t.title}
                          </Link>
                        </td>
                        <td
                          className={
                            overdue
                              ? "font-medium text-error"
                              : "whitespace-nowrap"
                          }
                        >
                          {t.due_date ?? "—"}
                        </td>
                        <td>
                          <StatusBadge status={t.priority} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <ClientMapDynamic
          markers={mapMarkers}
          missingCount={missingMapCount}
        />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-xl font-bold text-[#0b1f3a]">
            Campaign performance
          </h2>
          <Link href="/app/analytics" className="link link-hover text-sm">
            View client analytics
          </Link>
        </div>
        {!hasPerformance ? (
          <EmptyState
            title="No performance data yet"
            description="Clicks for your assigned campaigns will appear here."
          />
        ) : (
          <ClicksByCampaignChart data={clicksByCampaign} />
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-xl font-bold text-[#0b1f3a]">Schedule</h2>
          <Link href="/app/calendar" className="link link-hover text-sm">
            Open calendar
          </Link>
        </div>
        <DashboardCalendar
          tasks={calendarTasks}
          campaigns={calendarCampaigns}
          events={calendarEvents}
          todayStr={todayStr}
        />
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
    { data: pendingSignatures },
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
    supabase
      .from("signature_requests")
      .select("id")
      .eq("signer_user_id", profile.id)
      .in("status", ["Sent", "Viewed"]),
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
  const awaitingSignature = pendingSignatures?.length ?? 0;

  return (
    <div>
      <PageHeader
        title="Customer Dashboard"
        subtitle={`Welcome, ${profile.full_name}. Track campaigns, balances, and deliverables.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active campaigns" value={String(
          campaigns.filter((c) => c.campaign_status === "Active").length,
        )} />
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
        <Link href="/app/contracts/documents" className="block">
          <StatCard
            label="Contracts awaiting signature"
            value={String(awaitingSignature)}
            tone={awaitingSignature ? "warn" : "good"}
            hint="Open Contracts & Documents"
          />
        </Link>
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
                    {a.approval_type} Â· requested {a.requested_date}
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
