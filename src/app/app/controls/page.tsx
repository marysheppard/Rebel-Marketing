import { ControlsExceptionsTable } from "@/components/dashboards/ControlsExceptionsTable";
import { ListExportButton } from "@/components/exports/ListExportButton";
import { EmptyState, PageHeader } from "@/components/ui";
import { buildControlAlerts, SEVERITY_LABELS } from "@/lib/controls";
import { loadFinanceBundle } from "@/lib/finance-data";
import {
  clientProfitabilityRow,
  costsByClient,
  revenueByClient,
} from "@/lib/metrics";
import { requireRoles } from "@/lib/page-auth";
import type { ControlException } from "@/lib/types";

export default async function ControlsPage() {
  const { supabase, profile, userId } = await requireRoles(["agency_manager"]);

  const bundle = await loadFinanceBundle(supabase, userId, profile.role);
  const {
    clients,
    campaigns,
    costs,
    invoices,
    work,
    contracts,
    approvals,
    profiles,
  } = bundle;

  const revByClient = revenueByClient(invoices);
  const costMap = costsByClient(costs);
  const clientProfit = clients.map((cl) => {
    const row = clientProfitabilityRow(
      cl.id,
      cl.client_name,
      revByClient.get(cl.id) ?? 0,
      costMap.get(cl.id) ?? 0,
      0,
      0,
    );
    return {
      clientId: row.clientId,
      name: row.name,
      revenue: row.revenue,
      costs: row.costs,
      margin: row.margin,
    };
  });

  const alerts = buildControlAlerts({
    campaigns,
    contracts,
    costs,
    work,
    approvals,
    invoices,
    clients,
    clientProfit,
  });

  const { data: existing } = await supabase
    .from("control_exceptions")
    .select("fingerprint");

  const known = new Set((existing ?? []).map((e) => e.fingerprint));

  const toInsert = alerts
    .filter((a) => !known.has(a.id))
    .map((a) => ({
      fingerprint: a.id,
      exception_type: a.exceptionType ?? a.title,
      client_id: a.clientId ?? null,
      severity: a.severity,
      description: a.detail,
      href: a.href ?? null,
      status: "Open" as const,
    }));

  if (toInsert.length) {
    await supabase.from("control_exceptions").upsert(toInsert, {
      onConflict: "fingerprint",
      ignoreDuplicates: true,
    });
  }

  const { data: rows } = await supabase
    .from("control_exceptions")
    .select("*, clients(client_name), profiles:assigned_reviewer_id(full_name)")
    .order("detected_at", { ascending: false });

  const exceptions = (rows ?? []) as ControlException[];
  const reviewers = profiles
    .filter((p) => ["agency_manager", "account_manager"].includes(p.role))
    .map((r) => ({ id: r.id, full_name: r.full_name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Controls & Exceptions"
        subtitle="Agency control exceptions — mark Open, Under Review, or Resolved"
        actions={
          <ListExportButton
            className="btn btn-primary btn-sm gap-1"
            title="Export exceptions"
            description="Filter by status, severity, and date, then download CSV or PDF."
            filenameBase="control-exceptions"
            matchLabel="exceptions"
            headers={[
              "Type",
              "Client",
              "Detected",
              "Severity",
              "Description",
              "Status",
              "Reviewer",
            ]}
            items={exceptions.map((ex) => ({
              _status: ex.status,
              _type: ex.severity,
              _date: ex.detected_at?.slice(0, 10) ?? "",
              Type: ex.exception_type,
              Client:
                (ex.clients as { client_name?: string } | null)?.client_name ??
                "—",
              Detected: ex.detected_at?.slice(0, 10) ?? "—",
              Severity: ex.severity,
              Description: ex.description,
              Status: ex.status,
              Reviewer:
                (ex.profiles as { full_name?: string } | null)?.full_name ??
                "—",
            }))}
            filterConfig={{
              statusKey: "_status",
              statuses: [...new Set(exceptions.map((e) => e.status))].sort(),
              typeKey: "_type",
              types: [...new Set(exceptions.map((e) => e.severity))].sort(),
              typeLabel: "Severity",
              dateKey: "_date",
              showDates: true,
            }}
          />
        }
      />

      {!exceptions.length ? (
        <EmptyState
          title="No exceptions"
          description="Control checks did not find open issues."
        />
      ) : (
        <ControlsExceptionsTable
          exceptions={exceptions}
          reviewers={reviewers}
        />
      )}

      <p className="text-xs opacity-60">
        Severity labels: {Object.values(SEVERITY_LABELS).join(" · ")}. Live
        control rules also feed the Alerts page.
      </p>
    </div>
  );
}