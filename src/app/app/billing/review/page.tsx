import Link from "next/link";
import { InvoiceComposer } from "@/components/billing/InvoiceComposer";
import { PageHeader } from "@/components/ui";
import {
  DEFAULT_BILL_RATE_USD,
  estimateEntryAmount,
  parseWorkEntryIdsFromNotes,
  type ReadyMilestone,
  type UnbilledEntry,
} from "@/lib/billing";
import { contractBillRate } from "@/lib/finance";
import { joinField, num } from "@/lib/format";
import {
  canManageBilling,
  canViewBillingPages,
  getProfile,
} from "@/lib/page-auth";
import { redirect } from "next/navigation";

type SearchParams = Promise<{
  entries?: string;
  invoice?: string;
  milestones?: string;
}>;

export default async function BillingReviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { supabase, profile } = await getProfile();
  if (!profile) return null;
  if (!canViewBillingPages(profile.role)) redirect("/app");

  const sp = await searchParams;
  const canManage = canManageBilling(profile.role);

  const { data: contractsRaw } = await supabase
    .from("contracts")
    .select(
      "id, contract_name, contract_number, client_id, billing_method, monthly_retainer, project_fee, deposit_amount, included_agency_hours, overage_hourly_rate, pass_through_markup_pct",
    )
    .order("contract_name");

  const contracts = (contractsRaw ?? []).map((c) => ({
    id: c.id as string,
    label: `${c.contract_name} (${c.contract_number})`,
    client_id: c.client_id as string,
    monthly_retainer: num(c.monthly_retainer),
    billing_method: String(c.billing_method ?? ""),
    project_fee: num(c.project_fee),
    deposit_amount: num(c.deposit_amount),
    included_agency_hours: num(c.included_agency_hours),
    overage_hourly_rate: num(c.overage_hourly_rate),
    pass_through_markup_pct: num(c.pass_through_markup_pct),
  }));

  const rateByContract = new Map(
    contracts.map((c) => [
      c.id,
      contractBillRate(c, DEFAULT_BILL_RATE_USD),
    ]),
  );

  if (sp.invoice) {
    const { data: inv } = await supabase
      .from("invoices")
      .select("*, clients(client_name)")
      .eq("id", sp.invoice)
      .single();

    if (!inv) {
      return (
        <div>
          <PageHeader title="Invoice not found" />
          <Link href="/app/billing" className="btn btn-primary">
            Back to Billing
          </Link>
        </div>
      );
    }

    const workIds = parseWorkEntryIdsFromNotes(inv.notes as string);
    let entries: UnbilledEntry[] = [];

    if (workIds.length) {
      const { data: work } = await supabase
        .from("work_entries")
        .select(
          "id, campaign_id, hours, work_date, work_type, description, campaigns(campaign_name, client_id, contract_id, clients(client_name, industry))",
        )
        .in("id", workIds);

      entries = (work ?? []).map((w) => mapWorkRow(w, rateByContract));
    }

    const clientName =
      joinField(
        (inv as { clients?: { client_name: string } }).clients,
        "client_name",
      ) || "Client";

    let retainerPaidHint: number | null = null;
    let hasPriorSentInvoice = false;
    if (inv.contract_id) {
      const { data: related } = await supabase
        .from("invoices")
        .select("id, total_amount, status")
        .eq("contract_id", inv.contract_id)
        .neq("status", "Canceled");
      retainerPaidHint = (related ?? []).reduce(
        (s, r) => s + num(r.total_amount),
        0,
      );
      hasPriorSentInvoice = (related ?? []).some(
        (r) => r.id !== inv.id && r.status !== "Draft",
      );
    }

    return (
      <div>
        <InvoiceComposer
          mode="edit"
          entries={entries}
          existing={{
            id: inv.id,
            client_id: inv.client_id,
            contract_id: inv.contract_id,
            campaign_id: inv.campaign_id,
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            due_date: inv.due_date,
            subtotal: num(inv.subtotal),
            pass_through_amount: num(inv.pass_through_amount),
            tax_amount: num(inv.tax_amount),
            total_amount: num(inv.total_amount),
            status: inv.status,
            notes: inv.notes ?? "",
          }}
          contracts={contracts}
          clientName={clientName === "—" ? "Client" : clientName}
          canManage={canManage}
          retainerPaidHint={retainerPaidHint}
          hasPriorSentInvoice={hasPriorSentInvoice}
        />
      </div>
    );
  }

  const entryIds = (sp.entries ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const milestoneIds = (sp.milestones ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!entryIds.length && !milestoneIds.length) {
    return (
      <div>
        <PageHeader
          title="Review invoice"
          subtitle="Select work from Ready to Invoice or Approved milestones first."
        />
        <Link href="/app/billing" className="btn btn-primary">
          Back to Billing
        </Link>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div>
        <PageHeader
          title="Billing only"
          subtitle="Only the billing role can create invoices from approved work."
        />
        <Link href="/app/billing" className="btn btn-primary">
          Back to Billing
        </Link>
      </div>
    );
  }

  let entries: UnbilledEntry[] = [];
  let milestoneRows: ReadyMilestone[] = [];

  if (entryIds.length) {
    const { data: work } = await supabase
      .from("work_entries")
      .select(
        "id, campaign_id, hours, work_date, work_type, description, billable, billed, approval_status, campaigns(campaign_name, client_id, contract_id, clients(client_name, industry))",
      )
      .in("id", entryIds)
      .eq("billable", true)
      .eq("billed", false)
      .eq("approval_status", "Approved");

    entries = (work ?? []).map((w) => mapWorkRow(w, rateByContract));
  }

  if (milestoneIds.length) {
    const { data: ms } = await supabase
      .from("campaign_milestones")
      .select(
        "id, campaign_id, contract_id, sequence, name, recognition_amount, target_date, approved_at, status, billable, billed, campaigns(campaign_name, client_id, clients(client_name))",
      )
      .in("id", milestoneIds)
      .eq("status", "Approved")
      .eq("billable", true)
      .eq("billed", false);

    milestoneRows = (ms ?? []).map((m) => mapMilestoneBillingRow(m));
  }

  if (!entries.length && !milestoneRows.length) {
    return (
      <div>
        <PageHeader
          title="Nothing to invoice"
          subtitle="Those items may already be billed or are not approved."
        />
        <Link href="/app/billing" className="btn btn-primary">
          Back to Billing
        </Link>
      </div>
    );
  }

  const clientIds = new Set([
    ...entries.map((e) => e.client_id),
    ...milestoneRows.map((m) => m.client_id),
  ]);
  if (clientIds.size > 1) {
    return (
      <div>
        <PageHeader
          title="Multiple clients"
          subtitle="An invoice can only include work for one client."
        />
        <Link href="/app/billing" className="btn btn-primary">
          Back to Billing
        </Link>
      </div>
    );
  }

  const defaultContractId =
    entries.find((e) => e.contract_id)?.contract_id ??
    milestoneRows.find((m) => m.contract_id)?.contract_id ??
    null;
  let hasPriorSentInvoice = false;
  if (defaultContractId) {
    const { data: related } = await supabase
      .from("invoices")
      .select("id, status")
      .eq("contract_id", defaultContractId)
      .neq("status", "Canceled")
      .neq("status", "Draft");
    hasPriorSentInvoice = (related ?? []).length > 0;
  }

  const clientName =
    entries[0]?.client_name ?? milestoneRows[0]?.client_name ?? "Client";

  return (
    <div>
      <InvoiceComposer
        mode="create"
        entries={entries}
        milestones={milestoneRows}
        contracts={contracts}
        clientName={clientName}
        canManage={canManage}
        defaultContractId={defaultContractId}
        hasPriorSentInvoice={hasPriorSentInvoice}
      />
    </div>
  );
}

function mapMilestoneBillingRow(m: Record<string, unknown>): ReadyMilestone {
  const camps = m.campaigns as
    | {
        campaign_name?: string;
        client_id?: string;
        clients?:
          | { client_name?: string }
          | { client_name?: string }[]
          | null;
      }
    | {
        campaign_name?: string;
        client_id?: string;
        clients?:
          | { client_name?: string }
          | { client_name?: string }[]
          | null;
      }[]
    | null;
  const camp = Array.isArray(camps) ? camps[0] : camps;
  const clientsRel = camp?.clients;
  const clientObj = Array.isArray(clientsRel) ? clientsRel[0] : clientsRel;
  return {
    id: String(m.id),
    campaign_id: String(m.campaign_id),
    campaign_name: camp?.campaign_name ?? "Campaign",
    contract_id: m.contract_id ? String(m.contract_id) : null,
    client_id: String(camp?.client_id ?? ""),
    client_name: clientObj?.client_name ?? "Client",
    name: String(m.name ?? ""),
    sequence: Number(m.sequence ?? 0),
    recognition_amount: num(m.recognition_amount),
    target_date: m.target_date ? String(m.target_date) : null,
    approved_at: m.approved_at ? String(m.approved_at) : null,
    status: String(m.status ?? "Approved"),
    billable: Boolean(m.billable ?? true),
    billed: Boolean(m.billed ?? false),
  };
}

function mapWorkRow(
  w: Record<string, unknown>,
  rateByContract: Map<string, number>,
): UnbilledEntry {
  const camps = w.campaigns as
    | {
        campaign_name?: string;
        client_id?: string;
        contract_id?: string;
        clients?:
          | { client_name?: string; industry?: string }
          | { client_name?: string; industry?: string }[]
          | null;
      }
    | {
        campaign_name?: string;
        client_id?: string;
        contract_id?: string;
        clients?:
          | { client_name?: string; industry?: string }
          | { client_name?: string; industry?: string }[]
          | null;
      }[]
    | null;

  const camp = Array.isArray(camps) ? camps[0] : camps;
  const clientsRel = camp?.clients;
  const clientObj = Array.isArray(clientsRel) ? clientsRel[0] : clientsRel;
  const hours = num(w.hours);
  const contractId = camp?.contract_id ? String(camp.contract_id) : null;
  const rate =
    (contractId && rateByContract.get(contractId)) || DEFAULT_BILL_RATE_USD;

  return {
    id: String(w.id),
    work_date: String(w.work_date ?? ""),
    hours,
    work_type: String(w.work_type ?? ""),
    description: String(w.description ?? ""),
    campaign_id: String(w.campaign_id ?? ""),
    campaign_name: camp?.campaign_name ?? "Campaign",
    client_id: String(camp?.client_id ?? ""),
    client_name: clientObj?.client_name ?? "Client",
    company_type: String(clientObj?.industry ?? "").trim() || "Unspecified",
    estimated_rate: rate,
    estimated_amount: estimateEntryAmount(hours, rate),
    contract_id: contractId,
  };
}
