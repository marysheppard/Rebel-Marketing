import { CustomerDashboardBody } from "@/components/CustomerDashboardBody";
import { EmployeeDashboardBody } from "@/components/EmployeeDashboardBody";
import {
  AccountManagerDashboard,
  AgencyExecutiveDashboard,
  BillingStaffDashboard,
} from "@/components/dashboards/RoleDashboards";
import { EmptyState, PageHeader } from "@/components/ui";
import { paidAmount, remainingBalance } from "@/lib/finance";
import { money, num } from "@/lib/format";
import { isClientChangeType } from "@/lib/change-requests";
import { getProfile, isClientRole, isMarketingRole } from "@/lib/page-auth";
import { startOfWeek, toDateStr } from "@/lib/time";
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

  if (profile.role === "billing") {
    return (
      <BillingStaffDashboard
        userId={userId}
        profile={profile}
        supabase={supabase}
      />
    );
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
          description="This branch delivers the Marketing employee experience (EMP-1003). Other role dashboards are owned by other workstreams."
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
    { data: timeEntryRows },
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
    supabase
      .from("time_entries")
      .select("work_date, total_hours")
      .eq("employee_id", userId)
      .gte("work_date", toDateStr(startOfWeek(today))),
  ]);

  const assignedCampaignIds = [
    ...new Set((assignments ?? []).map((a) => String(a.campaign_id))),
  ];

  const { data: metricRows } =
    assignedCampaignIds.length > 0
      ? await supabase
          .from("campaign_metrics")
          .select(
            "campaign_id, metric_date, impressions, clicks, conversions, spend",
          )
          .in("campaign_id", assignedCampaignIds)
          .order("metric_date", { ascending: true })
      : {
          data: [] as {
            campaign_id: string;
            metric_date: string;
            impressions: number;
            clicks: number;
            conversions: number;
            spend: number;
          }[],
        };

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

  function clientHealth(
    openCount: number,
    overdueCount: number,
  ): "risk" | "attention" | "ok" {
    if (overdueCount > 0) return "risk";
    if (openCount > 0) return "attention";
    return "ok";
  }

  const nextDueByClient = new Map<string, string>();
  for (const t of openTasks) {
    if (!t.client_id || !t.due_date) continue;
    const prev = nextDueByClient.get(t.client_id);
    if (!prev || t.due_date < prev) nextDueByClient.set(t.client_id, t.due_date);
  }

  const mapClients = workingClients.map((c) => {
    const loc = locationById.get(c.id);
    const lat = loc?.latitude != null ? Number(loc.latitude) : NaN;
    const lng = loc?.longitude != null ? Number(loc.longitude) : NaN;
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const activeCampaigns = c.campaigns.filter(
      (camp) =>
        camp.status !== "Completed" &&
        camp.status !== "Canceled" &&
        camp.status !== "Cancelled",
    );
    return {
      id: c.id,
      name: c.name,
      city: loc?.city || undefined,
      state: loc?.state || undefined,
      hasCoords,
      lat: hasCoords ? lat : undefined,
      lng: hasCoords ? lng : undefined,
      openCount: c.openCount,
      overdueCount: c.overdueCount,
      activeCampaignCount: activeCampaigns.length,
      nextDueDate: nextDueByClient.get(c.id),
      campaignNames: activeCampaigns.slice(0, 3).map((camp) => camp.name),
      health: clientHealth(c.openCount, c.overdueCount),
    };
  });

  const mapMarkers = mapClients
    .filter((c) => c.hasCoords && c.lat != null && c.lng != null)
    .map((c) => ({
      id: c.id,
      name: c.name,
      lat: c.lat!,
      lng: c.lng!,
      city: c.city,
      state: c.state,
      openCount: c.openCount,
      overdueCount: c.overdueCount,
      activeCampaignCount: c.activeCampaignCount,
      nextDueDate: c.nextDueDate,
      campaignNames: c.campaignNames,
      health: c.health,
    }));

  const missingMapCount = mapClients.filter((c) => !c.hasCoords).length;

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
      clientId: t.client_id || undefined,
    }));

  const calendarCampaigns = myAssignments
    .filter((a) => a.campaigns?.end_date)
    .map((a) => ({
      id: a.campaigns!.id,
      title: a.campaigns!.campaign_name,
      date: a.campaigns!.end_date,
      clientId: a.campaigns!.client_id || undefined,
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

  const campaignMetaById = new Map<
    string,
    { name: string; clientId: string }
  >();
  for (const a of myAssignments) {
    if (a.campaigns) {
      campaignMetaById.set(a.campaigns.id, {
        name: a.campaigns.campaign_name,
        clientId: a.campaigns.client_id,
      });
    }
  }

  const totalsByCampaign = new Map<
    string,
    { name: string; clicks: number; impressions: number; clientId: string }
  >();
  const byDate = new Map<string, { impressions: number; clicks: number }>();

  for (const m of metricRows ?? []) {
    const cid = String(m.campaign_id);
    const meta = campaignMetaById.get(cid);
    const name = meta?.name ?? "Campaign";
    const clientId = meta?.clientId ?? "";
    const prev = totalsByCampaign.get(cid) ?? {
      name,
      clicks: 0,
      impressions: 0,
      clientId,
    };
    prev.clicks += num(m.clicks);
    prev.impressions += num(m.impressions);
    totalsByCampaign.set(cid, prev);

    const d = String(m.metric_date ?? "");
    if (d) {
      const day = byDate.get(d) ?? { impressions: 0, clicks: 0 };
      day.impressions += num(m.impressions);
      day.clicks += num(m.clicks);
      byDate.set(d, day);
    }
  }

  const clicksByCampaign = [...totalsByCampaign.values()]
    .map((r) => ({ name: r.name, clicks: r.clicks, clientId: r.clientId }))
    .sort((a, b) => b.clicks - a.clicks);

  const ctrByCampaign = [...totalsByCampaign.values()]
    .map((r) => ({
      name: r.name,
      ctr:
        r.impressions > 0
          ? Math.round((r.clicks / r.impressions) * 10000) / 100
          : 0,
      clientId: r.clientId,
    }))
    .sort((a, b) => b.ctr - a.ctr);

  const metricsTrend = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date: date.slice(5),
      impressions: v.impressions,
      clicks: v.clicks,
    }));

  const statusCounts = new Map<string, number>();
  const priorityCounts = new Map<string, number>();
  for (const t of tasks) {
    statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1);
    priorityCounts.set(t.priority, (priorityCounts.get(t.priority) ?? 0) + 1);
  }
  const taskMix = [...statusCounts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const PRIORITY_ORDER = ["Urgent", "High", "Medium", "Low"];
  const taskPriority = PRIORITY_ORDER.map((priority) => ({
    priority,
    count: priorityCounts.get(priority) ?? 0,
  }));

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekStart = startOfWeek(today);
  const weeklyHours = dayLabels.map((day, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const key = toDateStr(d);
    const hours = (timeEntryRows ?? [])
      .filter((e) => String(e.work_date) === key)
      .reduce((s, e) => s + num(e.total_hours), 0);
    return { day, hours: Math.round(hours * 100) / 100 };
  });

  return (
    <EmployeeDashboardBody
      userId={userId}
      fullName={profile.full_name}
      todayStr={todayStr}
      overdueCount={overdueTasks.length}
      awaitingApprovalCount={awaitingApproval.length}
      clientCount={workingClients.length}
      openTaskCount={openTasks.length}
      overdueTaskCount={overdueTasks.length}
      tasks={openTasks.map((t) => ({
        id: t.id,
        title: t.title,
        due_date: t.due_date,
        priority: t.priority,
        status: t.status,
        client_id: t.client_id || null,
      }))}
      mapMarkers={mapMarkers}
      mapClients={mapClients}
      missingMapCount={missingMapCount}
      clicksByCampaign={clicksByCampaign}
      calendarTasks={calendarTasks}
      calendarCampaigns={calendarCampaigns}
      calendarEvents={calendarEvents}
      taskMix={taskMix}
      taskPriority={taskPriority}
      weeklyHours={weeklyHours}
      metricsTrend={metricsTrend}
      ctrByCampaign={ctrByCampaign}
    />
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

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const dueSoonCutoff = new Date(today);
  dueSoonCutoff.setDate(dueSoonCutoff.getDate() + 7);
  const dueSoonStr = dueSoonCutoff.toISOString().slice(0, 10);

  const isOpenInvoice = (i: Invoice) =>
    remainingBalance(i) > 0 && !["Draft", "Canceled", "Paid"].includes(i.status);

  const openInvoices = invoices
    .filter(isOpenInvoice)
    .slice()
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const balance = openInvoices.reduce((s, i) => s + remainingBalance(i), 0);
  const totalInvoiced = invoices
    .filter((i) => !["Draft", "Canceled"].includes(i.status))
    .reduce((s, i) => s + num(i.total_amount), 0);
  const overdueTotal = openInvoices
    .filter((i) => i.due_date < todayStr)
    .reduce((s, i) => s + remainingBalance(i), 0);
  const nextDue = openInvoices[0] ?? null;
  const pending = approvals.filter(
    (a) =>
      a.approval_status === "Pending" && !isClientChangeType(a.approval_type),
  );
  const pendingChangeRequests = approvals.filter(
    (a) =>
      a.approval_status === "Pending" && isClientChangeType(a.approval_type),
  );
  const awaitingSignature = pendingSignatures?.length ?? 0;

  const campaignRows = campaigns.map((c) => {
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
    return {
      id: c.id,
      campaign_name: c.campaign_name,
      campaign_type: c.campaign_type,
      campaign_status: c.campaign_status,
      start_date: c.start_date,
      end_date: c.end_date,
      spent,
      budget,
      timePct,
      pctUsed,
    };
  });

  const openInvoiceRows = openInvoices.map((i) => {
    const remaining = remainingBalance(i);
    const paid = paidAmount(i);
    const overdue = i.due_date < todayStr;
    const dueSoon =
      !overdue && i.due_date <= dueSoonStr && i.due_date >= todayStr;
    return {
      id: i.id,
      invoice_number: i.invoice_number,
      due_date: i.due_date,
      status: i.status,
      total: num(i.total_amount),
      paid,
      remaining,
      overdue,
      dueSoon,
    };
  });

  return (
    <CustomerDashboardBody
      userId={profile.id}
      fullName={profile.full_name}
      activeCampaignCount={
        campaigns.filter((c) => c.campaign_status === "Active").length
      }
      totalInvoiced={totalInvoiced}
      balance={balance}
      pendingCount={pending.length}
      pendingChangeRequestCount={pendingChangeRequests.length}
      awaitingSignature={awaitingSignature}
      campaigns={campaignRows}
      openInvoices={openInvoiceRows}
      nextDueLabel={
        nextDue
          ? `${nextDue.invoice_number} · ${nextDue.due_date} · ${money(remainingBalance(nextDue))}`
          : null
      }
      overdueTotal={overdueTotal}
      invoiceCount={invoices.length}
      pendingApprovals={pending.map((a) => ({
        id: a.id,
        approval_type: a.approval_type,
        description: a.description,
        requested_date: a.requested_date,
        approval_status: a.approval_status,
        campaign_name: a.campaigns?.campaign_name ?? "Campaign",
      }))}
    />
  );
}
