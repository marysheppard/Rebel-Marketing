import Link from "next/link";
import { ContractsTable } from "@/components/ContractsTable";
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
      .select("*, clients(client_name)")
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
      clients?: { client_name: string } | { client_name: string }[] | null;
    }).clients;
    const clientName = Array.isArray(clientsRel)
      ? clientsRel[0]?.client_name
      : clientsRel?.client_name;

    return {
      id: c.id as string,
      contract_name: c.contract_name as string,
      contract_number: c.contract_number as string,
      client_id: c.client_id as string,
      client_name: clientName ?? "—",
      contract_status: c.contract_status as string,
      billing_method: c.billing_method as string,
      monthly_retainer: Number(c.monthly_retainer ?? 0),
      project_fee: Number(c.project_fee ?? 0),
      campaign_budget: Number(c.campaign_budget ?? 0),
      start_date: (c.start_date as string) ?? "",
      end_date: (c.end_date as string) ?? "",
    };
  });

  return (
    <div>
      <PageHeader
        title="Contracts"
        subtitle="Commercial terms, billing methods, and budgets"
        actions={
          showForm ? (
            <Link href="/app/contracts/builder" className="btn btn-primary btn-sm">
              Create Marketing Contract
            </Link>
          ) : null
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
