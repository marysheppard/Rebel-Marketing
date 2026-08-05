import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CreateCostForm } from "@/components/forms";
import { CostDashboard } from "@/components/costs/CostDashboard";
import { joinOne, num } from "@/lib/format";
import { canManageCosts, getProfile, isClientRole } from "@/lib/page-auth";
import type { CostRow, InvoicePassThroughRow } from "@/lib/costs/calculations";

export default async function CostsPage() {
  const { supabase, profile } = await getProfile();
  if (!profile) return null;

  if (isClientRole(profile.role) || !canManageCosts(profile.role)) {
    redirect("/app");
  }

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
      .select(
        "id, campaign_name, contract_id, contracts(reimbursable_vendor_costs, pass_through_markup_pct, advertising_spend_treatment, approval_required, spending_approval_threshold)",
      )
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
            campaigns={(campaigns ?? []).map((c) => {
              const contract = joinOne(
                (
                  c as {
                    contracts?:
                      | {
                          reimbursable_vendor_costs: boolean;
                          pass_through_markup_pct: number;
                          advertising_spend_treatment: string;
                          approval_required: boolean;
                          spending_approval_threshold: number;
                        }
                      | {
                          reimbursable_vendor_costs: boolean;
                          pass_through_markup_pct: number;
                          advertising_spend_treatment: string;
                          approval_required: boolean;
                          spending_approval_threshold: number;
                        }[]
                      | null;
                  }
                ).contracts,
              );
              return {
                id: c.id,
                label: c.campaign_name,
                contract_id: c.contract_id,
                reimbursable_vendor_costs:
                  contract?.reimbursable_vendor_costs ?? true,
                pass_through_markup_pct: num(contract?.pass_through_markup_pct),
                advertising_spend_treatment:
                  contract?.advertising_spend_treatment || "",
                approval_required: Boolean(contract?.approval_required),
                spending_approval_threshold: num(
                  contract?.spending_approval_threshold,
                ),
              };
            })}
          />
        </section>
      ) : null}
    </div>
  );
}
