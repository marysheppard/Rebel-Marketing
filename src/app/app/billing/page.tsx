import { BillingPageClient } from "@/components/billing/BillingPageClient";
import {
  DEFAULT_BILL_RATE_USD,
  estimateEntryAmount,
  partitionInvoices,
  type BillingInvoiceRow,
  type ReadyMilestone,
  type UnbilledEntry,
} from "@/lib/billing";
import { contractBillRate, remainingBalance } from "@/lib/finance";
import { joinField, num } from "@/lib/format";
import {
  canManageBilling,
  canViewBillingPages,
  getProfile,
} from "@/lib/page-auth";
import { redirect } from "next/navigation";

export default async function BillingPage() {
  const { supabase, profile } = await getProfile();
  if (!profile) return null;
  if (!canViewBillingPages(profile.role)) redirect("/app");

  const canManage = canManageBilling(profile.role);

  const [{ data: invoicesRaw }, { data: unbilledWork }, { data: campaignsMeta }, readyMsRes] =
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
          "id, campaign_id, hours, work_date, work_type, description, campaigns(campaign_name, client_id, contract_id, clients(client_name, industry))",
        )
        .eq("billable", true)
        .eq("billed", false)
        .eq("approval_status", "Approved")
        .order("work_date", { ascending: false }),
      supabase.from("campaigns").select("id, campaign_name, contract_id"),
      supabase
        .from("campaign_milestones")
        .select(
          "id, campaign_id, contract_id, sequence, name, recognition_amount, target_date, approved_at, status, billable, billed, campaigns(campaign_name, client_id, clients(client_name))",
        )
        .eq("status", "Approved")
        .eq("billable", true)
        .eq("billed", false)
        .order("approved_at", { ascending: true }),
    ]);

  const contractIds = [
    ...new Set(
      (unbilledWork ?? [])
        .map((w) => {
          const camps = w.campaigns as
            | { contract_id?: string }
            | { contract_id?: string }[]
            | null;
          const camp = Array.isArray(camps) ? camps[0] : camps;
          return camp?.contract_id ? String(camp.contract_id) : null;
        })
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: contractsRaw } = contractIds.length
    ? await supabase
        .from("contracts")
        .select("id, overage_hourly_rate")
        .in("id", contractIds)
    : { data: [] as { id: string; overage_hourly_rate: number | null }[] };

  const rateByContract = new Map(
    (contractsRaw ?? []).map((c) => [
      c.id as string,
      contractBillRate(c, DEFAULT_BILL_RATE_USD),
    ]),
  );

  const campaignNameById = new Map(
    (campaignsMeta ?? []).map((c) => [c.id as string, c.campaign_name as string]),
  );

  const unbilled: UnbilledEntry[] = (unbilledWork ?? []).map((w) => {
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
      | Array<{
          campaign_name?: string;
          client_id?: string;
          contract_id?: string;
          clients?:
            | { client_name?: string; industry?: string }
            | { client_name?: string; industry?: string }[]
            | null;
        }>
      | null;

    const camp = Array.isArray(camps) ? camps[0] : camps;
    const clientsRel = camp?.clients;
    const clientObj = Array.isArray(clientsRel) ? clientsRel[0] : clientsRel;
    const hours = num(w.hours);
    const contractId = camp?.contract_id ? String(camp.contract_id) : null;
    const rate =
      (contractId && rateByContract.get(contractId)) || DEFAULT_BILL_RATE_USD;

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
      company_type: String(clientObj?.industry ?? "").trim() || "Unspecified",
      estimated_rate: rate,
      estimated_amount: estimateEntryAmount(hours, rate),
      contract_id: contractId,
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

  const readyMilestones: ReadyMilestone[] = (readyMsRes.data ?? []).map((m) => {
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
      billable: Boolean(m.billable),
      billed: Boolean(m.billed),
    };
  });

  return (
    <BillingPageClient
      unbilled={unbilled}
      readyMilestones={readyMilestones}
      drafts={drafts}
      active={active}
      history={history}
      allInvoices={invoiceRows}
      canManage={canManage}
    />
  );
}
