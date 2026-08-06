import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClientSignForm } from "@/components/ClientSignForm";
import { ContractTimeline } from "@/components/ContractTimeline";
import { PageHeader, StatusBadge } from "@/components/ui";
import { normalizeContractStatus } from "@/lib/contract-status";
import { getOpenSignatureRequestForClientUser } from "@/lib/contract-signing";
import { getProfile, isClientRole } from "@/lib/page-auth";

export default async function ContractSignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile, userId } = await getProfile();
  if (!profile || !userId) redirect("/login");
  if (!isClientRole(profile.role)) redirect(`/app/contracts/${id}`);

  const { data: contract } = await supabase
    .from("contracts")
    .select("*, clients(client_name)")
    .eq("id", id)
    .single();
  if (!contract) notFound();

  const request = await getOpenSignatureRequestForClientUser(
    supabase,
    id,
    userId,
  );

  let viewedAt = request?.viewed_at ?? null;
  if (request?.status === "Sent") {
    const now = new Date().toISOString();
    await supabase
      .from("signature_requests")
      .update({
        status: "Viewed",
        viewed_at: now,
        updated_at: now,
      })
      .eq("id", request.id);
    viewedAt = now;
  }

  const status = normalizeContractStatus(contract.contract_status);
  const canSign = !!request && status === "Awaiting Client Signature";
  const html =
    request?.agreement_html_snapshot ||
    contract.signed_agreement_html ||
    contract.agreement_html ||
    "";

  return (
    <div>
      <PageHeader
        title="Review & Sign"
        subtitle={contract.contract_name}
        actions={
          <Link href="/app/contracts/documents" className="btn btn-ghost btn-sm">
            ← Contracts & Documents
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge status={status} />
        {(contract.clients as { client_name?: string } | null)?.client_name ? (
          <span className="badge badge-outline badge-sm">
            {(contract.clients as { client_name: string }).client_name}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <h3 className="mb-3 font-semibold">Agreement</h3>
          {html ? (
            <iframe
              title="Agreement"
              className="min-h-[70vh] w-full rounded-box border border-base-300 bg-white"
              srcDoc={html}
            />
          ) : (
            <p className="text-sm opacity-70">No agreement document available.</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-box border border-base-300 bg-base-100 p-4">
            <h3 className="mb-3 font-semibold">Timeline</h3>
            <ContractTimeline
              contractStatus={status}
              finalizedAt={contract.finalized_at}
              clientSignedAt={contract.client_signed_at}
              agencySignedAt={contract.agency_signed_at}
              fullyExecutedAt={contract.fully_executed_at}
              sentAt={request?.sent_at}
              viewedAt={viewedAt}
              requestStatus={request ? "Viewed" : null}
            />
          </div>

          {canSign ? (
            <ClientSignForm
              contractId={id}
              defaultName={profile.full_name}
              agencyMessage={request?.agency_message || ""}
            />
          ) : (
            <div className="rounded-box border border-base-300 bg-base-100 p-4 text-sm opacity-70">
              {status === "Awaiting Agency Signature"
                ? "You have signed. Waiting for Rebel Marketing to countersign."
                : status === "Fully Executed" || status === "Active"
                  ? "This agreement is fully executed."
                  : "This agreement is not open for your signature."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
