import Link from "next/link";
import { redirect } from "next/navigation";
import { ContractBuilderForm } from "@/components/ContractBuilderForm";
import { PageHeader } from "@/components/ui";
import { canManageContracts, getProfile, isClientRole } from "@/lib/page-auth";
import type { Client } from "@/lib/types";

export default async function ContractBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const { supabase, profile } = await getProfile();
  if (!profile) return null;
  if (!canManageContracts(profile.role) || isClientRole(profile.role)) {
    redirect("/app/contracts");
  }

  if (!clientId) {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, client_name, status")
      .order("client_name");

    return (
      <div>
        <PageHeader
          title="Create Marketing Contract"
          subtitle="Pick an existing client. Each new contract is a separate engagement — the company stays one client record."
          actions={
            <Link href="/app/clients/intake" className="btn btn-outline btn-sm">
              New Client Intake
            </Link>
          }
        />
        <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
          <table className="table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(clients ?? []).map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/app/clients/${c.id}`} className="link link-hover font-medium">
                      {c.client_name}
                    </Link>
                  </td>
                  <td>{c.status}</td>
                  <td className="text-right">
                    <Link
                      href={`/app/contracts/builder?clientId=${c.id}`}
                      className="btn btn-primary btn-sm"
                    >
                      Build contract
                    </Link>
                  </td>
                </tr>
              ))}
              {!clients?.length ? (
                <tr>
                  <td colSpan={3} className="opacity-60">
                    No clients yet. Start with Client Intake.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (!client) redirect("/app/contracts/builder");

  return (
    <div>
      <PageHeader
        title="Marketing Contract Creation"
        subtitle="Enter structured contract terms, then generate the Marketing Services Agreement."
        actions={
          <Link href={`/app/clients/${client.id}`} className="btn btn-ghost btn-sm">
            Client profile
          </Link>
        }
      />
      <ContractBuilderForm client={client as Client} />
    </div>
  );
}
