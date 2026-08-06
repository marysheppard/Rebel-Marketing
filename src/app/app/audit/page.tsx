import { AuditTrailExplorer } from "@/components/dashboards/AuditTrailExplorer";
import { ListExportButton } from "@/components/exports/ListExportButton";
import { PageHeader } from "@/components/ui";
import { AUDIT_CATEGORIES, buildAuditTrail } from "@/lib/audit-trail";
import { loadFinanceBundle } from "@/lib/finance-data";
import { requireRoles } from "@/lib/page-auth";
import type {
  Approval,
  ControlException,
  Cost,
  Invoice,
  Payment,
  Task,
  WorkEntry,
} from "@/lib/types";

export default async function AuditTrailPage() {
  const { supabase, profile, userId } = await requireRoles(["agency_manager"]);

  const bundle = await loadFinanceBundle(supabase, userId, profile.role);
  const {
    clients,
    campaigns,
    costs,
    invoices,
    payments,
    approvals,
    profiles,
    work,
  } = bundle;

  const [{ data: exceptionRows }, { data: taskRows }] = await Promise.all([
    supabase
      .from("control_exceptions")
      .select("*, clients(client_name), profiles:assigned_reviewer_id(full_name)")
      .order("detected_at", { ascending: false }),
    supabase
      .from("tasks")
      .select(
        "id, title, status, assignee_id, created_by, campaign_id, created_at, submitted_at, completed_at",
      )
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  const campIds = new Set(campaigns.map((c) => c.id));
  const scopedTasks = (taskRows ?? []).filter((t) =>
    campIds.has(t.campaign_id),
  );

  const events = buildAuditTrail({
    payments: payments as Payment[],
    invoices: invoices as Invoice[],
    approvals: approvals as Approval[],
    costs: costs as Cost[],
    exceptions: (exceptionRows ?? []) as ControlException[],
    work: work as WorkEntry[],
    tasks: scopedTasks as Task[],
    clients: clients.map((c) => ({ id: c.id, client_name: c.client_name })),
    campaigns: campaigns.map((c) => ({
      id: c.id,
      campaign_name: c.campaign_name,
      client_id: c.client_id,
    })),
    profiles: profiles.map((p) => ({ id: p.id, full_name: p.full_name })),
  });

  const employees = [...profiles]
    .map((p) => ({ id: p.id, full_name: p.full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trail"
        subtitle="Who did what — employee time, tasks, approvals, costs, invoices, payments, and exceptions"
        actions={
          <ListExportButton
            className="btn btn-primary btn-sm gap-1"
            title="Export audit trail"
            description="Filter by category, client, and date, then download CSV or PDF."
            filenameBase="audit-trail"
            matchLabel="events"
            headers={[
              "When",
              "Category",
              "Summary",
              "Detail",
              "Actor",
              "Client",
              "Campaign",
            ]}
            items={events.map((r) => ({
              _clientId: r.clientId ?? "",
              _type: r.category,
              _date: r.occurredAt?.slice(0, 10) ?? "",
              When: r.occurredAt,
              Category: r.category,
              Summary: r.summary,
              Detail: r.detail ?? "—",
              Actor: r.actorName ?? "—",
              Client: r.clientName ?? "—",
              Campaign: r.campaignName ?? "—",
            }))}
            filterConfig={{
              clientKey: "_clientId",
              clients: clients
                .map((c) => ({ id: c.id, name: c.client_name }))
                .sort((a, b) => a.name.localeCompare(b.name)),
              typeKey: "_type",
              types: [...AUDIT_CATEGORIES],
              typeLabel: "Category",
              dateKey: "_date",
              showDates: true,
            }}
          />
        }
      />
      <AuditTrailExplorer
        events={events}
        clients={clients.map((c) => ({
          id: c.id,
          client_name: c.client_name,
        }))}
        employees={employees}
      />
    </div>
  );
}
