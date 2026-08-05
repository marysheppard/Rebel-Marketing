import Link from "next/link";
import { ExceptionStatusForm } from "@/components/dashboards/ExceptionStatusForm";
import { SeverityBadge } from "@/components/dashboards/AlertPanel";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
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
  const reviewers = profiles.filter((p) =>
    ["agency_manager", "account_manager"].includes(p.role),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Controls & Exceptions"
        subtitle="Agency control exceptions — mark Open, Under Review, or Resolved"
      />

      {!exceptions.length ? (
        <EmptyState
          title="No exceptions"
          description="Control checks did not find open issues."
        />
      ) : (
        <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Type</th>
                <th>Client</th>
                <th>Detected</th>
                <th>Severity</th>
                <th>Description</th>
                <th>Status</th>
                <th>Reviewer</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map((ex) => (
                <tr key={ex.id}>
                  <td className="font-medium whitespace-nowrap">
                    {ex.exception_type}
                    {ex.href ? (
                      <div>
                        <Link href={ex.href} className="link link-primary text-xs">
                          Open
                        </Link>
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {(ex.clients as { client_name?: string } | null)
                      ?.client_name ?? "—"}
                  </td>
                  <td className="whitespace-nowrap text-xs">
                    {new Date(ex.detected_at).toLocaleDateString()}
                  </td>
                  <td>
                    <SeverityBadge severity={ex.severity} />
                  </td>
                  <td className="max-w-xs text-sm">{ex.description}</td>
                  <td>
                    <StatusBadge status={ex.status} />
                  </td>
                  <td>
                    {(ex.profiles as { full_name?: string } | null)?.full_name ??
                      "—"}
                  </td>
                  <td>
                    <ExceptionStatusForm
                      exceptionId={ex.id}
                      currentStatus={ex.status}
                      reviewers={reviewers.map((r) => ({
                        id: r.id,
                        full_name: r.full_name,
                      }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs opacity-60">
        Severity labels: {Object.values(SEVERITY_LABELS).join(" · ")}. Live
        control rules also feed the Alerts page.
      </p>
    </div>
  );
}
