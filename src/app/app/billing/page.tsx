import { BillingPageClient } from "@/components/billing/BillingPageClient";
import {
  DEFAULT_BILL_RATE_USD,
  estimateEntryAmount,
  partitionInvoices,
  type BillingInvoiceRow,
  type UnbilledEntry,
} from "@/lib/billing";
import { remainingBalance } from "@/lib/finance";
import { joinField, num } from "@/lib/format";
import { canManageBilling, getProfile } from "@/lib/page-auth";

export default async function BillingPage() {
  const { supabase, profile } = await getProfile();
  if (!profile) return null;

  const canManage = canManageBilling(profile.role);

  const [{ data: invoicesRaw }, { data: unbilledWork }, { data: campaignsMeta }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select(
          "*, clients(client_name, contact_name, contact_email, contact_phone), payments(amount), campaigns(campaign_name), contracts(contract_number, contract_name, payment_terms)",
        )
        .order("invoice_date", { ascending: false }),
      supabase
        .from("work_entries")
        .select(
          "id, campaign_id, hours, work_date, work_type, description, campaigns(campaign_name, client_id, clients(client_name))",
        )
        .eq("billable", true)
        .eq("billed", false)
        .eq("approval_status", "Approved")
        .order("work_date", { ascending: false }),
      supabase.from("campaigns").select("id, campaign_name"),
    ]);

  const campaignNameById = new Map(
    (campaignsMeta ?? []).map((c) => [c.id as string, c.campaign_name as string]),
  );

  const unbilled: UnbilledEntry[] = (unbilledWork ?? []).map((w) => {
    const camps = w.campaigns as
      | {
          campaign_name?: string;
          client_id?: string;
          clients?:
            | { client_name?: string }
            | { client_name?: string }[]
            | null;
        }
      | Array<{
          campaign_name?: string;
          client_id?: string;
          clients?:
            | { client_name?: string }
            | { client_name?: string }[]
            | null;
        }>
      | null;

    const camp = Array.isArray(camps) ? camps[0] : camps;
    const clientsRel = camp?.clients;
    const clientObj = Array.isArray(clientsRel) ? clientsRel[0] : clientsRel;
    const hours = num(w.hours);
    const rate = DEFAULT_BILL_RATE_USD;

    return {
      id: w.id as string,
      work_date: String(w.work_date ?? ""),
      hours,
      work_type: String(w.work_type ?? ""),
      description: String(w.description ?? ""),
      campaign_id: String(w.campaign_id ?? ""),
      campaign_name:
        camp?.campaign_name ??
        campaignNameById.get(String(w.campaign_id)) ??
        "Campaign",
      client_id: String(camp?.client_id ?? ""),
      client_name: clientObj?.client_name ?? "Client",
      estimated_rate: rate,
      estimated_amount: estimateEntryAmount(hours, rate),
    };
  });

  const invoiceRows: BillingInvoiceRow[] = (invoicesRaw ?? []).map((i) => {
    const clientsRel = (i as {
      clients?: {
        client_name?: string;
        contact_name?: string;
        contact_email?: string;
        contact_phone?: string;
      };
    }).clients;
    const contractsRel = (i as {
      contracts?: {
        contract_number?: string;
        contract_name?: string;
        payment_terms?: string | null;
      };
    }).contracts;
    const clientName = joinField(clientsRel, "client_name") || "—";
    const campLabel =
      joinField(
        (i as { campaigns?: { campaign_name: string } }).campaigns,
        "campaign_name",
      ) || (i.campaign_id ? campaignNameById.get(i.campaign_id) ?? "—" : "—");
    const clientObj = Array.isArray(clientsRel) ? clientsRel[0] : clientsRel;
    const contractObj = Array.isArray(contractsRel)
      ? contractsRel[0]
      : contractsRel;

    return {
      id: i.id,
      client_id: i.client_id,
      contract_id: i.contract_id,
      campaign_id: i.campaign_id,
      invoice_number: i.invoice_number,
      invoice_date: i.invoice_date,
      due_date: i.due_date,
      subtotal: num(i.subtotal),
      pass_through_amount: num(i.pass_through_amount),
      tax_amount: num(i.tax_amount),
      total_amount: num(i.total_amount),
      status: i.status,
      disputed: Boolean(i.disputed),
      notes: i.notes ?? "",
      created_at: i.created_at,
      client_name: clientName === "—" ? "Client" : clientName,
      remaining: remainingBalance(i),
      campaign_label: campLabel,
      payments: i.payments as { amount: number }[] | null,
      contact_name: clientObj?.contact_name ?? "",
      contact_email: clientObj?.contact_email ?? "",
      contact_phone: clientObj?.contact_phone ?? "",
      contract_number: contractObj?.contract_number ?? null,
      contract_name: contractObj?.contract_name ?? null,
      payment_terms: contractObj?.payment_terms ?? null,
    };
  });

  const { drafts, active, history } = partitionInvoices(invoiceRows);

  return (
    <BillingPageClient
      unbilled={unbilled}
      drafts={drafts}
      active={active}
      history={history}
      allInvoices={invoiceRows}
      canManage={canManage}
    />
  );
}
