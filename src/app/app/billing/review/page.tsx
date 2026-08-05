import Link from "next/link";
import { InvoiceComposer } from "@/components/billing/InvoiceComposer";
import { PageHeader } from "@/components/ui";
import {
  DEFAULT_BILL_RATE_USD,
  estimateEntryAmount,
  parseWorkEntryIdsFromNotes,
  type UnbilledEntry,
} from "@/lib/billing";
import { joinField, num } from "@/lib/format";
import { canManageBilling, getProfile } from "@/lib/page-auth";

type SearchParams = Promise<{ entries?: string; invoice?: string }>;

export default async function BillingReviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { supabase, profile } = await getProfile();
  if (!profile) return null;

  const sp = await searchParams;
  const canManage = canManageBilling(profile.role);

  const { data: contractsRaw } = await supabase
    .from("contracts")
    .select("id, contract_name, contract_number, client_id, monthly_retainer")
    .order("contract_name");

  const contracts = (contractsRaw ?? []).map((c) => ({
    id: c.id as string,
    label: `${c.contract_name} (${c.contract_number})`,
    client_id: c.client_id as string,
    monthly_retainer: num(c.monthly_retainer),
  }));

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
          "id, campaign_id, hours, work_date, work_type, description, campaigns(campaign_name, client_id, clients(client_name))",
        )
        .in("id", workIds);

      entries = (work ?? []).map((w) => mapWorkRow(w));
    }

    const clientName =
      joinField(
        (inv as { clients?: { client_name: string } }).clients,
        "client_name",
      ) || "Client";

    let retainerPaidHint: number | null = null;
    if (inv.contract_id) {
      const { data: related } = await supabase
        .from("invoices")
        .select("total_amount")
        .eq("contract_id", inv.contract_id)
        .neq("status", "Canceled");
      retainerPaidHint = (related ?? []).reduce(
        (s, r) => s + num(r.total_amount),
        0,
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
        />
      </div>
    );
  }

  const entryIds = (sp.entries ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!entryIds.length) {
    return (
      <div>
        <PageHeader
          title="Review invoice"
          subtitle="Select work from Ready to Invoice first."
        />
        <Link href="/app/billing" className="btn btn-primary">
          Back to Billing
        </Link>
      </div>
    );
  }

  const { data: work } = await supabase
    .from("work_entries")
    .select(
      "id, campaign_id, hours, work_date, work_type, description, billable, billed, approval_status, campaigns(campaign_name, client_id, clients(client_name))",
    )
    .in("id", entryIds)
    .eq("billable", true)
    .eq("billed", false)
    .eq("approval_status", "Approved");

  const entries = (work ?? []).map((w) => mapWorkRow(w));

  if (!entries.length) {
    return (
      <div>
        <PageHeader
          title="No work to invoice"
          subtitle="Those entries may already be billed or are not approved."
        />
        <Link href="/app/billing" className="btn btn-primary">
          Back to Billing
        </Link>
      </div>
    );
  }

  const clientIds = new Set(entries.map((e) => e.client_id));
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

  return (
    <div>
      <InvoiceComposer
        mode="create"
        entries={entries}
        contracts={contracts}
        clientName={entries[0].client_name}
        canManage={canManage}
      />
    </div>
  );
}

function mapWorkRow(w: Record<string, unknown>): UnbilledEntry {
  const camps = w.campaigns as
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
  const hours = num(w.hours);
  const rate = DEFAULT_BILL_RATE_USD;

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
    estimated_rate: rate,
    estimated_amount: estimateEntryAmount(hours, rate),
  };
}
