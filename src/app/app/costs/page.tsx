import { Suspense } from "react";
import { CreateCostForm } from "@/components/forms";
import { CostDashboard } from "@/components/costs/CostDashboard";
import { canManageCosts, getProfile, isClientRole } from "@/lib/page-auth";
import type { CostRow, InvoicePassThroughRow } from "@/lib/costs/calculations";

export default async function CostsPage() {
  const { supabase, profile } = await getProfile();
  if (!profile) return null;

  const [
    { data: costs },
    { data: campaigns },
    { data: clients },
    { data: invoices },
  ] = await Promise.all([
    supabase
      .from("costs")
      .select(
        "*, campaigns(campaign_name, campaign_budget, client_id, clients(client_name))",
      )
      .order("cost_date", { ascending: false }),
    supabase
      .from("campaigns")
      .select("id, campaign_name")
      .in("campaign_status", ["Active", "Late", "On Hold", "Completed"])
      .order("campaign_name"),
    supabase.from("clients").select("id, client_name").order("client_name"),
    supabase
      .from("invoices")
      .select("id, campaign_id, status, pass_through_amount"),
  ]);

  const showForm = canManageCosts(profile.role) && !isClientRole(profile.role);

  const costRows = (costs ?? []) as CostRow[];
  const invoiceRows = (invoices ?? []) as InvoicePassThroughRow[];

  return (
    <div>
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="skeleton h-16 w-full" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-28 w-full" />
              ))}
            </div>
            <div className="skeleton h-64 w-full" />
          </div>
        }
      >
        <CostDashboard
          costs={costRows}
          invoices={invoiceRows}
          clients={(clients ?? []).map((c) => ({
            id: c.id,
            label: c.client_name,
          }))}
          campaigns={(campaigns ?? []).map((c) => ({
            id: c.id,
            label: c.campaign_name,
          }))}
          showRecordCost={showForm}
        />
      </Suspense>

      {showForm ? (
        <section
          id="record-cost"
          className="mt-8 scroll-mt-24 rounded-box border border-base-300 bg-base-100 p-6"
        >
          <h2 className="mb-4 text-xl font-bold">Record cost</h2>
          <CreateCostForm
            campaigns={(campaigns ?? []).map((c) => ({
              id: c.id,
              label: c.campaign_name,
            }))}
          />
        </section>
      ) : null}
    </div>
  );
}
