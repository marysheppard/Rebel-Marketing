import Link from "next/link";
import { CreateContractForm } from "@/components/forms";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { money } from "@/lib/format";
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
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table">
            <thead>
              <tr>
                <th>Contract</th>
                <th>Client</th>
                <th>Status</th>
                <th>Billing</th>
                <th className="text-right">Retainer</th>
                <th className="text-right">Project fee</th>
                <th className="text-right">Budget</th>
                <th>Dates</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="hover">
                  <td>
                    <Link href={`/app/contracts/${c.id}`} className="link link-hover font-medium">
                      {c.contract_name}
                    </Link>
                    <div className="text-xs opacity-60">{c.contract_number}</div>
                  </td>
                  <td>
                    <Link href={`/app/clients/${c.client_id}`} className="link link-hover">
                      {(c as { clients?: { client_name: string } }).clients?.client_name ?? "—"}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge status={c.contract_status} />
                  </td>
                  <td>{c.billing_method}</td>
                  <td className="text-right">{money(c.monthly_retainer)}</td>
                  <td className="text-right">{money(c.project_fee)}</td>
                  <td className="text-right">{money(c.campaign_budget)}</td>
                  <td className="text-sm whitespace-nowrap opacity-70">
                    {c.start_date} → {c.end_date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
