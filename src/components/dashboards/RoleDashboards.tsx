import { Suspense } from "react";
import {
  PortfolioDashboardClient,
  type PortfolioDashboardSource,
} from "@/components/dashboards/PortfolioDashboardClient";
import { loadFinanceBundle } from "@/lib/finance-data";
import type { Profile } from "@/lib/types";
import type { getProfile } from "@/lib/page-auth";

type Sb = Awaited<ReturnType<typeof getProfile>>["supabase"];

async function buildDashboardSource(
  supabase: Sb,
  userId: string,
  profile: Profile,
  role: "agency_manager" | "account_manager",
): Promise<PortfolioDashboardSource> {
  const bundle = await loadFinanceBundle(supabase, userId, role);
  const { clients, campaigns, costs, invoices, work, profiles } = bundle;

  const campIds = campaigns.map((c) => c.id);
  const clientIds = clients.map((c) => c.id);
  const campIdSet = new Set(campIds);
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: taskRows },
    { data: assignmentRows },
    exceptionsRes,
    approvalsRes,
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, assignee_id, status, due_date, campaign_id"),
    campIds.length
      ? supabase
          .from("campaign_assignments")
          .select("user_id, campaign_id")
          .in("campaign_id", campIds)
      : Promise.resolve({
          data: [] as { user_id: string; campaign_id: string }[],
        }),
    role === "agency_manager"
      ? supabase
          .from("control_exceptions")
          .select("id", { count: "exact", head: true })
          .neq("status", "Resolved")
      : Promise.resolve({ count: 0 }),
    role === "account_manager" && clientIds.length
      ? supabase
          .from("approvals")
          .select("id", { count: "exact", head: true })
          .eq("approval_status", "Pending")
          .in("client_id", clientIds)
      : Promise.resolve({ count: 0 }),
  ]);

  const scopedTasks = (taskRows ?? [])
    .filter((t) =>
      role === "account_manager"
        ? campIdSet.has(t.campaign_id)
        : true,
    )
    .map((t) => ({
      id: t.id,
      assignee_id: t.assignee_id as string | null,
      status: t.status as string,
      due_date: t.due_date as string | null,
    }));

  const openOnBook = scopedTasks.filter((t) => t.status !== "Completed");
  const overdueOnBook = openOnBook.filter(
    (t) => t.due_date != null && t.due_date < today,
  );

  return {
    fullName: profile.full_name,
    openExceptions: exceptionsRes.count ?? 0,
    pendingApprovals: approvalsRes.count ?? 0,
    openTasksOnBook: openOnBook.length,
    overdueTasksOnBook: overdueOnBook.length,
    clients: clients.map((c) => ({
      id: c.id,
      client_name: c.client_name,
      status: c.status,
    })),
    campaigns: campaigns.map((c) => ({
      id: c.id,
      campaign_name: c.campaign_name,
      client_id: c.client_id,
      campaign_budget: c.campaign_budget,
      campaign_status: c.campaign_status,
    })),
    invoices: invoices.map((i) => ({
      client_id: i.client_id,
      campaign_id: i.campaign_id,
      total_amount: i.total_amount,
      status: i.status,
      invoice_date: i.invoice_date,
      due_date: i.due_date,
      payments: i.payments,
    })),
    costs: costs.map((c) => ({
      client_id: c.client_id ?? null,
      campaign_id: c.campaign_id ?? null,
      amount: c.amount,
      cost_date: c.cost_date,
    })),
    work: work.map((w) => ({
      campaign_id: w.campaign_id,
      user_id: w.user_id,
      hours: w.hours,
      work_date: w.work_date,
    })),
    profiles: profiles.map((p) => ({
      id: p.id,
      full_name: p.full_name,
      role: p.role,
      internal_cost_rate: p.internal_cost_rate,
    })),
    tasks: scopedTasks,
    assignments: (assignmentRows ?? []).map((a) => ({
      user_id: a.user_id,
      campaign_id: a.campaign_id,
    })),
  };
}

function DashboardFallback() {
  return (
    <div className="space-y-4 py-8">
      <div className="h-8 w-64 animate-pulse rounded bg-base-300" />
      <div className="h-24 animate-pulse rounded-box bg-base-300" />
      <div className="grid gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-box bg-base-300" />
        ))}
      </div>
    </div>
  );
}

export async function AccountManagerDashboard({
  userId,
  profile,
  supabase,
}: {
  userId: string;
  profile: Profile;
  supabase: Sb;
}) {
  const source = await buildDashboardSource(
    supabase,
    userId,
    profile,
    "account_manager",
  );
  return (
    <Suspense fallback={<DashboardFallback />}>
      <PortfolioDashboardClient source={source} variant="account_manager" />
    </Suspense>
  );
}

export async function AgencyExecutiveDashboard({
  userId,
  profile,
  supabase,
}: {
  userId: string;
  profile: Profile;
  supabase: Sb;
}) {
  const source = await buildDashboardSource(
    supabase,
    userId,
    profile,
    "agency_manager",
  );
  return (
    <Suspense fallback={<DashboardFallback />}>
      <PortfolioDashboardClient source={source} variant="agency" />
    </Suspense>
  );
}
