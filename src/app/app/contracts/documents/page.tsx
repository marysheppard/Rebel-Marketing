import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { normalizeContractStatus } from "@/lib/contract-status";
import { getProfile, isClientRole } from "@/lib/page-auth";
import { redirect } from "next/navigation";

export default async function ContractsDocumentsPage() {
  const { supabase, profile, userId } = await getProfile();
  if (!profile || !userId) redirect("/login");
  if (!isClientRole(profile.role)) redirect("/app/contracts");

  const [{ data: contracts }, { data: requests }] = await Promise.all([
    supabase
      .from("contracts")
      .select("id, contract_name, contract_number, contract_status, client_signed_at, agency_signed_at, fully_executed_at, clients(client_name)")
      .order("updated_at", { ascending: false }),
    supabase
      .from("signature_requests")
      .select("id, contract_id, status, sent_at, due_at, signer_user_id")
      .eq("signer_user_id", userId)
      .in("status", ["Sent", "Viewed", "Awaiting Agency", "Fully Executed", "Declined"])
      .order("sent_at", { ascending: false }),
  ]);

  const openByContract = new Map(
    (requests ?? [])
      .filter((r) => r.status === "Sent" || r.status === "Viewed")
      .map((r) => [r.contract_id as string, r]),
  );

  const rows = contracts ?? [];

  return (
    <div>
      <PageHeader
        title="Contracts & Documents"
        subtitle="Review agreements sent for your signature and view executed documents."
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No contracts yet"
          description="When Rebel Marketing sends an agreement for signature, it will appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
          <table className="table">
            <thead>
              <tr>
                <th>Contract</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const status = normalizeContractStatus(c.contract_status);
                const open = openByContract.get(c.id);
                const clientMeta = c.clients as { client_name?: string } | null;
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="font-medium">{c.contract_name}</div>
                      <div className="text-xs opacity-60">
                        {c.contract_number}
                        {clientMeta?.client_name ? ` · ${clientMeta.client_name}` : ""}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={status} />
                      {open?.due_at ? (
                        <div className="mt-1 text-xs opacity-60">
                          Due {new Date(open.due_at).toLocaleDateString()}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {open ? (
                        <Link
                          href={`/app/contracts/${c.id}/sign`}
                          className="btn btn-primary btn-sm"
                        >
                          Review &amp; Sign
                        </Link>
                      ) : (
                        <Link
                          href={`/app/contracts/${c.id}`}
                          className="btn btn-ghost btn-sm"
                        >
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
