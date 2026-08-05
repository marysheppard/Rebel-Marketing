import { AnalyticsExplorer } from "@/components/dashboards/AnalyticsExplorer";
import { PageHeader } from "@/components/ui";
import { loadFinanceBundle } from "@/lib/finance-data";
import { requireRoles } from "@/lib/page-auth";

export default async function AnalyticsPage() {
  const { supabase, profile, userId } = await requireRoles([
    "agency_manager",
    "account_manager",
  ]);

  const bundle = await loadFinanceBundle(supabase, userId, profile.role);
  const { campaigns, metrics, invoices, work, profiles } = bundle;

  const campIds = campaigns.map((c) => c.id);
  const [
    { data: assignments },
    { data: tasks },
  ] = await Promise.all([
    campIds.length
      ? supabase
          .from("campaign_assignments")
          .select("user_id, campaign_id")
          .in("campaign_id", campIds)
      : Promise.resolve({ data: [] as { user_id: string; campaign_id: string }[] }),
    supabase
      .from("tasks")
      .select("assignee_id, status, due_date, campaign_id")
      .limit(500),
  ]);

  const scopedProfiles =
    profile.role === "agency_manager"
      ? profiles.filter((p) => p.role !== "client")
      : profiles.filter(
          (p) =>
            p.role !== "client" &&
            (p.id === userId ||
              assignments?.some((a) => a.user_id === p.id) ||
              work.some((w) => w.user_id === p.id)),
        );

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle={
          profile.role === "agency_manager"
            ? "Agency and employee media performance — clicks, impressions, and delivery"
            : "Portfolio media performance for your clients and team"
        }
      />
      <AnalyticsExplorer
        source={{
          profiles: scopedProfiles.map((p) => ({
            id: p.id,
            full_name: p.full_name,
            role: p.role,
            department: p.department ?? null,
          })),
          campaigns: campaigns.map((c) => ({
            id: c.id,
            campaign_name: c.campaign_name,
            client_id: c.client_id,
            clients: (c as { clients?: { client_name: string } | null }).clients,
          })),
          metrics: metrics.map((m) => ({
            campaign_id: m.campaign_id,
            metric_date: m.metric_date,
            impressions: m.impressions,
            clicks: m.clicks,
            conversions: m.conversions,
            spend: m.spend,
          })),
          invoices: invoices.map((i) => ({
            client_id: i.client_id,
            campaign_id: i.campaign_id,
            total_amount: i.total_amount,
            status: i.status,
            invoice_date: i.invoice_date,
          })),
          assignments: (assignments ?? []).map((a) => ({
            user_id: a.user_id,
            campaign_id: a.campaign_id,
          })),
          work: work.map((w) => ({
            user_id: w.user_id,
            campaign_id: w.campaign_id,
            hours: w.hours,
            work_date: w.work_date,
          })),
          tasks: (tasks ?? []).map((t) => ({
            assignee_id: t.assignee_id,
            status: t.status,
            due_date: t.due_date,
            campaign_id: t.campaign_id,
          })),
        }}
      />
    </div>
  );
}
