import Link from "next/link";
import { ContractsTable } from "@/components/ContractsTable";
import { ListExportButton } from "@/components/exports/ListExportButton";
import { CreateContractForm } from "@/components/forms";
import { EmptyState, PageHeader } from "@/components/ui";
import {
  canManageContracts,
  isClientRole,
  requireRoles,
} from "@/lib/page-auth";
import { getManagedClientIds } from "@/lib/portfolio";

export default async function ContractsPage() {
  const { supabase, profile, userId } = await requireRoles([
    "agency_manager",
    "account_manager",
    "billing",
    "client",
  ]);

  const scope = await getManagedClientIds(supabase, userId, profile.role);

  const [{ data: contracts }, { data: clients }] = await Promise.all([
    supabase
      .from("contracts")
      .select(
        "*, clients(client_name, contact_name, contact_email, contact_phone)",
      )
      .order("start_date", { ascending: false }),
    supabase.from("clients").select("id, client_name").order("client_name"),
  ]);

  let list = contracts ?? [];
  if (profile.role === "account_manager" && scope !== "all") {
    const set = new Set(scope);
    list = list.filter((c) => set.has(c.client_id));
  }
  const showForm = canManageContracts(profile.role) && !isClientRole(profile.role);

  const tableRows = list.map((c) => {
    const clientsRel = (c as {
      clients?:
        | {
            client_name?: string;
            contact_name?: string;
            contact_email?: string;
            contact_phone?: string;
          }
        | {
            client_name?: string;
            contact_name?: string;
            contact_email?: string;
            contact_phone?: string;
          }[]
        | null;
    }).clients;
    const clientObj = Array.isArray(clientsRel) ? clientsRel[0] : clientsRel;

    return {
      id: c.id as string,
      contract_name: c.contract_name as string,
      contract_number: c.contract_number as string,
      client_id: c.client_id as string,
      client_name: clientObj?.client_name ?? "—",
      contract_status: c.contract_status as string,
      billing_method: c.billing_method as string,
      monthly_retainer: Number(c.monthly_retainer ?? 0),
      project_fee: Number(c.project_fee ?? 0),
      campaign_budget: Number(c.campaign_budget ?? 0),
      start_date: (c.start_date as string) ?? "",
      end_date: (c.end_date as string) ?? "",
      payment_terms: (c.payment_terms as string | null) ?? null,
      deposit_amount: Number(c.deposit_amount ?? 0),
      auto_renew: Boolean(
        (c as { auto_renew?: boolean | null }).auto_renew ??
          (c as { renewal_option?: boolean | null }).renewal_option,
      ),
      contact_name: clientObj?.contact_name ?? "",
      contact_email: clientObj?.contact_email ?? "",
      contact_phone: clientObj?.contact_phone ?? "",
    };
  });

  return (
    <div>
      <PageHeader
        title="Contracts"
        subtitle="Commercial terms, billing methods, and budgets"
        actions={
          <div className="flex flex-wrap gap-2">
            <ListExportButton
              title="Export contracts"
              description="Filter by client, status, and dates, then download CSV or PDF."
              filenameBase="contracts"
              matchLabel="contracts"
              headers={[
                "Contract",
                "Contract #",
                "Client",
                "Status",
                "Billing Method",
                "Retainer",
                "Project Fee",
                "Budget",
                "Start",
                "End",
                "Payment Terms",
                "Deposit",
                "Auto Renew",
              ]}
              items={tableRows.map((r) => ({
                _clientId: r.client_id,
                _status: r.contract_status,
                _date: r.start_date || r.end_date,
                Contract: r.contract_name,
                "Contract #": r.contract_number,
                Client: r.client_name,
                Status: r.contract_status,
                "Billing Method": r.billing_method,
                Retainer: r.monthly_retainer.toFixed(2),
                "Project Fee": r.project_fee.toFixed(2),
                Budget: r.campaign_budget.toFixed(2),
                Start: r.start_date || "—",
                End: r.end_date || "—",
                "Payment Terms": r.payment_terms || "—",
                Deposit: (r.deposit_amount ?? 0).toFixed(2),
                "Auto Renew": r.auto_renew ? "Yes" : "No",
              }))}
              filterConfig={{
                clientKey: "_clientId",
                clients: [
                  ...new Map(
                    tableRows.map((r) => [r.client_id, r.client_name] as const),
                  ).entries(),
                ]
                  .map(([id, name]) => ({ id, name }))
                  .sort((a, b) => a.name.localeCompare(b.name)),
                statusKey: "_status",
                statuses: [
                  ...new Set(tableRows.map((r) => r.contract_status)),
                ].sort(),
                dateKey: "_date",
                showDates: true,
              }}
            />
            {showForm ? (
              <Link
                href="/app/contracts/builder"
                className="btn btn-primary btn-sm"
              >
                Create Marketing Contract
              </Link>
            ) : null}
          </div>
        }
      />

      {list.length === 0 ? (
        <EmptyState
          title="No contracts"
          description="Create a contract to link campaigns and billing to a client agreement."
        />
      ) : (
        <ContractsTable rows={tableRows} />
      )}

      {showForm ? (
        <section className="mt-8 rounded-box border border-base-300 bg-base-100 p-6">
          <h2 className="mb-4 text-xl font-bold">New contract</h2>
          <CreateContractForm
            clients={(clients ?? []).map((c) => ({ id: c.id, label: c.client_name }))}
          />
        </section>
      ) : null}
    </div>
  );
}
