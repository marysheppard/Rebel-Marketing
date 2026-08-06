import { ClientContractsDocumentsTable } from "@/components/contracts/ClientContractsDocumentsTable";
import { EmptyState, PageHeader } from "@/components/ui";
import { getProfile, isClientRole } from "@/lib/page-auth";
import { redirect } from "next/navigation";

export default async function ContractsDocumentsPage() {
  const { supabase, profile, userId } = await getProfile();
  if (!profile || !userId) redirect("/login");
  if (!isClientRole(profile.role)) redirect("/app/contracts");

  const [{ data: contracts }, { data: requests }] = await Promise.all([
    supabase
      .from("contracts")
      .select(
        "id, client_id, contract_name, contract_number, contract_status, billing_method, monthly_retainer, project_fee, campaign_budget, start_date, end_date, payment_terms, deposit_amount, renewal_option, client_signed_at, agency_signed_at, fully_executed_at, clients(client_name, contact_name, contact_email, contact_phone)",
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("signature_requests")
      .select("id, contract_id, status, sent_at, due_at, signer_user_id")
      .eq("signer_user_id", userId)
      .in("status", [
        "Sent",
        "Viewed",
        "Awaiting Agency",
        "Fully Executed",
        "Declined",
      ])
      .order("sent_at", { ascending: false }),
  ]);

  const openByContract = new Map(
    (requests ?? [])
      .filter((r) => r.status === "Sent" || r.status === "Viewed")
      .map((r) => [r.contract_id as string, r]),
  );

  const rows = (contracts ?? []).map((c) => {
    const clientsRel = c.clients as
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
    const clientObj = Array.isArray(clientsRel) ? clientsRel[0] : clientsRel;
    const open = openByContract.get(c.id as string);

    return {
      id: c.id as string,
      contract_name: c.contract_name as string,
      contract_number: c.contract_number as string,
      client_id: c.client_id as string,
      client_name: clientObj?.client_name ?? "—",
      contract_status: c.contract_status as string,
      billing_method: (c.billing_method as string) ?? "",
      monthly_retainer: Number(c.monthly_retainer ?? 0),
      project_fee: Number(c.project_fee ?? 0),
      campaign_budget: Number(c.campaign_budget ?? 0),
      start_date: (c.start_date as string) ?? "",
      end_date: (c.end_date as string) ?? "",
      payment_terms: (c.payment_terms as string | null) ?? null,
      deposit_amount: Number(c.deposit_amount ?? 0),
      auto_renew: Boolean(
        (c as { renewal_option?: boolean | null }).renewal_option,
      ),
      contact_name: clientObj?.contact_name ?? "",
      contact_email: clientObj?.contact_email ?? "",
      contact_phone: clientObj?.contact_phone ?? "",
      due_at: (open?.due_at as string | null) ?? null,
      open_for_signature: Boolean(open),
    };
  });

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
        <ClientContractsDocumentsTable rows={rows} />
      )}
    </div>
  );
}
