import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivateEngagementButton } from "@/components/ActivateEngagementButton";
import { ContractExecutionPanel } from "@/components/ContractExecutionPanel";
import { ContractTimeline } from "@/components/ContractTimeline";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { normalizeContractStatus } from "@/lib/contract-status";
import { money, num, pct } from "@/lib/format";
import { profitMargin, sumCosts } from "@/lib/finance";
import {
  canCountersign,
  canManageContracts,
  getProfile,
  isClientRole,
} from "@/lib/page-auth";
import type { Contract } from "@/lib/types";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await getProfile();

  const { data: contract } = await supabase
    .from("contracts")
    .select("*, clients(client_name, customer_id)")
    .eq("id", id)
    .single();
  if (!contract) notFound();

  const [{ data: campaigns }, { data: invoices }, { data: costs }, { data: request }] =
    await Promise.all([
      supabase.from("campaigns").select("*").eq("contract_id", id),
      supabase.from("invoices").select("*").eq("contract_id", id),
      supabase.from("costs").select("amount, campaign_id"),
      supabase
        .from("signature_requests")
        .select("*")
        .eq("contract_id", id)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const campIds = new Set((campaigns ?? []).map((c) => c.id));
  const contractCosts = sumCosts(
    (costs ?? []).filter((c) => c.campaign_id && campIds.has(c.campaign_id)),
  );
  const revenue = (invoices ?? [])
    .filter((i) => !["Draft", "Canceled"].includes(i.status))
    .reduce((s, i) => s + num(i.total_amount), 0);
  const profit = revenue - contractCosts;
  const margin = profitMargin(revenue, contractCosts);

  const clientMeta = (
    contract as {
      clients?: { client_name: string; customer_id?: string } | null;
    }
  ).clients;
  const clientName = clientMeta?.client_name;
  const canManage =
    !!profile && canManageContracts(profile.role) && !isClientRole(profile.role);
  const canSignAgency =
    !!profile && canCountersign(profile.role) && !isClientRole(profile.role);
  const showExecutionPanel = canManage || canSignAgency;
  const status = normalizeContractStatus(contract.contract_status);
  const html =
    contract.signed_agreement_html || contract.agreement_html || "";

  return (
    <div>
      <PageHeader
        title={contract.contract_name}
        subtitle={`${contract.contract_number}${clientName ? ` · ${clientName}` : ""}${
          clientMeta?.customer_id ? ` · ${clientMeta.customer_id}` : ""
        }`}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {showExecutionPanel ? (
              <ContractExecutionPanel
                contract={contract as Contract}
                canManage={canManage}
                canCountersign={canSignAgency}
                hasCampaign={(campaigns ?? []).length > 0}
                profileName={profile?.full_name || ""}
                openRequest={
                  request && ["Sent", "Viewed"].includes(String(request.status))
                    ? {
                        id: String(request.id),
                        status: String(request.status),
                        signer_user_id: request.signer_user_id as string | null,
                        due_at: request.due_at as string | null,
                        sent_at: request.sent_at as string | null,
                      }
                    : null
                }
              />
            ) : null}
            {profile && isClientRole(profile.role) &&
            status === "Awaiting Client Signature" ? (
              <Link href={`/app/contracts/${id}/sign`} className="btn btn-primary btn-sm">
                Review &amp; Sign
              </Link>
            ) : null}
            <ActivateEngagementButton
              contract={{ ...(contract as Contract), contract_status: status }}
              hasCampaign={(campaigns ?? []).length > 0}
            />
            <Link href={`/app/clients/${contract.client_id}`} className="btn btn-ghost btn-sm">
              Client profile
            </Link>
            {canManage ? (
              <Link
                href={`/app/contracts/builder?clientId=${contract.client_id}`}
                className="btn btn-outline btn-sm"
              >
                New contract (same client)
              </Link>
            ) : null}
            <Link href="/app/contracts" className="btn btn-ghost btn-sm">
              ← All contracts
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge status={status} />
        <span className="badge badge-outline badge-sm">{contract.billing_method}</span>
        {contract.agreement_locked ? (
          <span className="badge badge-warning badge-sm">Agreement locked</span>
        ) : null}
        {contract.current_version_number ? (
          <span className="badge badge-outline badge-sm">
            v{contract.current_version_number}
          </span>
        ) : null}
        {contract.approval_required ? (
          <span className="badge badge-warning badge-sm">Approval required</span>
        ) : null}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="rounded-box border border-base-300 bg-base-100 p-4 text-sm">
          {(contract.client_signed_at || contract.agency_signed_at) && (
            <div className="mb-3 space-y-1">
              {contract.client_signed_at ? (
                <p>
                  Client signed by <strong>{contract.client_signer_name || "—"}</strong>
                  {contract.client_signer_title ? ` (${contract.client_signer_title})` : ""} on{" "}
                  {new Date(contract.client_signed_at).toLocaleString()}
                </p>
              ) : null}
              {contract.agency_signed_at ? (
                <p>
                  Agency countersigned by{" "}
                  <strong>{contract.agency_signer_name || "—"}</strong> on{" "}
                  {new Date(contract.agency_signed_at).toLocaleString()}
                </p>
              ) : null}
            </div>
          )}
          {request?.decline_reason ? (
            <p className="text-error">
              Declined: {request.decline_reason}
            </p>
          ) : status === "Awaiting Agency Signature" ? (
            <p className="opacity-70">
              {canSignAgency
                ? "Client has signed. Review the agreement and complete Agency Countersign."
                : "Client has signed. Waiting for an agency manager to countersign."}
            </p>
          ) : request &&
            ["Sent", "Viewed"].includes(String(request.status)) ? (
            <p className="opacity-70">
              Sent to the client portal for signature
              {request.sent_at
                ? ` on ${new Date(String(request.sent_at)).toLocaleString()}`
                : ""}
              {request.due_at
                ? ` · due ${new Date(String(request.due_at)).toLocaleDateString()}`
                : ""}
              . The assigned client user will see it under Contracts &amp; Documents after login.
            </p>
          ) : status === "Fully Executed" || status === "Active" ? (
            <p className="opacity-70">
              Agreement fully executed. Use Sync engagement if needed.
            </p>
          ) : (
            <p className="opacity-70">
              Engagement sync is available after the agreement is fully executed.
            </p>
          )}
        </div>
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <h3 className="mb-3 font-semibold">Execution timeline</h3>
          <ContractTimeline
            contractStatus={status}
            finalizedAt={contract.finalized_at}
            clientSignedAt={contract.client_signed_at}
            agencySignedAt={contract.agency_signed_at}
            fullyExecutedAt={contract.fully_executed_at}
            declinedAt={request?.declined_at}
            requestStatus={request?.status}
            viewedAt={request?.viewed_at}
            sentAt={request?.sent_at}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Monthly retainer" value={money(contract.monthly_retainer)} />
        <StatCard label="Project fee" value={money(contract.project_fee)} />
        <StatCard label="Ad / campaign budget" value={money(contract.campaign_budget)} />
        <StatCard label="Profit margin" value={pct(margin)} tone={profit >= 0 ? "good" : "bad"} />
        <StatCard label="Included hours" value={String(num(contract.included_agency_hours))} />
        <StatCard label="Overage rate" value={money(contract.overage_hourly_rate)} />
        <StatCard label="Pass-through markup" value={`${num(contract.pass_through_markup_pct)}%`} />
        <StatCard
          label="Approval threshold"
          value={contract.approval_required ? money(contract.spending_approval_threshold) : "N/A"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <h3 className="font-semibold">Terms</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="opacity-60">Period</dt>
              <dd>
                {contract.start_date} → {contract.end_date}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-60">Billing frequency</dt>
              <dd>{contract.billing_frequency || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-60">Payment terms</dt>
              <dd>{contract.payment_terms || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-60">Deposit</dt>
              <dd>{money(contract.deposit_amount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-60">Ad spend treatment</dt>
              <dd>{contract.advertising_spend_treatment || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-60">Reimbursable vendors</dt>
              <dd>{contract.reimbursable_vendor_costs ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-60">Renewal option</dt>
              <dd>{contract.renewal_option ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-60">Cancellation notice</dt>
              <dd>{contract.cancellation_notice_days ?? 0} days</dd>
            </div>
          </dl>
          {(contract.service_types as string[] | null)?.length ? (
            <p className="mt-4 text-sm opacity-80">
              <span className="font-medium">Services:</span>{" "}
              {(contract.service_types as string[]).join(", ")}
            </p>
          ) : null}
          {contract.deliverables ? (
            <p className="mt-2 text-sm opacity-80">
              <span className="font-medium">Deliverables:</span> {contract.deliverables}
            </p>
          ) : null}
          {contract.scope ? (
            <p className="mt-2 text-sm opacity-80">
              <span className="font-medium">Scope:</span> {contract.scope}
            </p>
          ) : null}
          {contract.renewal_terms ? (
            <p className="mt-2 text-sm opacity-70">
              <span className="font-medium">Renewal terms:</span> {contract.renewal_terms}
            </p>
          ) : null}
          {contract.cancellation_terms ? (
            <p className="mt-2 text-sm opacity-70">
              <span className="font-medium">Cancellation:</span> {contract.cancellation_terms}
            </p>
          ) : null}
        </div>

        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <h3 className="mb-3 font-semibold">Agreement document</h3>
          {html ? (
            <iframe
              title="Agreement"
              className="min-h-[420px] w-full rounded-box border border-base-300 bg-white"
              srcDoc={html}
            />
          ) : (
            <p className="text-sm opacity-70">
              Generate an agreement from the Contract Builder to preview it here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
