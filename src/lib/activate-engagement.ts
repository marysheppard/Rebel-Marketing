import { suggestedInvoiceSubtotal } from "@/lib/finance";
import type { Contract } from "@/lib/types";

type EngagementContract = Pick<
  Contract,
  | "id"
  | "client_id"
  | "contract_name"
  | "contract_number"
  | "contract_status"
  | "start_date"
  | "end_date"
  | "billing_method"
  | "monthly_retainer"
  | "project_fee"
  | "campaign_budget"
  | "payment_terms"
  | "service_types"
  | "deliverables"
  | "scope"
  | "deposit_amount"
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = { from: (table: string) => any };

export function mapServicesToCampaignType(services: string[] | null | undefined): string {
  const list = services ?? [];
  if (list.some((s) => /Paid Social|Google|Search Advertising/i.test(s))) return "Advertising";
  if (list.some((s) => /Social Media Management/i.test(s))) return "Social Media";
  if (list.some((s) => /Brand/i.test(s))) return "Branding";
  if (list.some((s) => /Content|Graphic Design/i.test(s))) return "Content";
  if (list.some((s) => /Email/i.test(s))) return "Email";
  if (list.some((s) => /Website|Landing/i.test(s))) return "Website";
  return "Other";
}

function dueDateFromPaymentTerms(invoiceDate: string, paymentTerms: string) {
  const d = new Date(`${invoiceDate}T12:00:00`);
  const terms = paymentTerms.toLowerCase();
  if (terms.includes("15")) d.setDate(d.getDate() + 15);
  else if (terms.includes("45")) d.setDate(d.getDate() + 45);
  else if (terms.includes("due on receipt")) d.setDate(d.getDate());
  else d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

/**
 * Creates campaign + optional draft invoice for an Active contract.
 * Always reuses the existing client_id — never inserts a clients row.
 */
export async function activateEngagement(
  supabase: AnySupabase,
  contract: EngagementContract,
): Promise<{ campaignId: string | null; invoiceId: string | null; error: string | null }> {
  if (
    contract.contract_status !== "Active" &&
    contract.contract_status !== "Fully Executed"
  ) {
    return { campaignId: null, invoiceId: null, error: null };
  }

  // Mark client Active Client without creating a new client record
  await supabase
    .from("clients")
    .update({ status: "Active Client" })
    .eq("id", contract.client_id);

  const { data: existingCampaigns } = await supabase
    .from("campaigns")
    .select("id")
    .eq("contract_id", contract.id)
    .limit(1);

  let campaignId: string | null = existingCampaigns?.[0]?.id ?? null;

  if (!campaignId) {
    const { data: campaign, error: campError } = await supabase
      .from("campaigns")
      .insert({
        client_id: contract.client_id,
        contract_id: contract.id,
        campaign_name: `${contract.contract_name} — Engagement`,
        campaign_type: mapServicesToCampaignType(contract.service_types),
        start_date: contract.start_date,
        end_date: contract.end_date,
        campaign_status: "Active",
        campaign_budget: contract.campaign_budget || 0,
        project_fee: contract.project_fee || 0,
        description:
          contract.deliverables?.trim() ||
          contract.scope?.trim() ||
          `Active engagement for ${contract.contract_number}`,
        target_audience: "",
      })
      .select("id")
      .single();

    if (campError || !campaign) {
      return {
        campaignId: null,
        invoiceId: null,
        error: campError?.message || "Could not create engagement campaign.",
      };
    }
    campaignId = campaign.id;
  }

  const { data: existingInvoices } = await supabase
    .from("invoices")
    .select("id")
    .eq("contract_id", contract.id)
    .limit(1);

  let invoiceId: string | null = existingInvoices?.[0]?.id ?? null;
  const subtotal = suggestedInvoiceSubtotal(contract);
  const deposit = Number(contract.deposit_amount) || 0;
  const billAmount = deposit > 0 ? deposit : subtotal;

  if (!invoiceId && billAmount > 0) {
    const invoiceDate = contract.start_date;
    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .insert({
        client_id: contract.client_id,
        contract_id: contract.id,
        campaign_id: campaignId,
        invoice_number: `INV-${contract.contract_number}`.slice(0, 40),
        invoice_date: invoiceDate,
        due_date: dueDateFromPaymentTerms(invoiceDate, contract.payment_terms || "Net 30"),
        subtotal: billAmount,
        pass_through_amount: 0,
        tax_amount: 0,
        total_amount: billAmount,
        status: "Draft",
        notes:
          deposit > 0
            ? `Deposit draft from contract ${contract.contract_number}`
            : `Opening draft from contract ${contract.contract_number} (${contract.billing_method})`,
      })
      .select("id")
      .single();

    if (invError) {
      return {
        campaignId,
        invoiceId: null,
        error: invError.message || "Campaign created but draft invoice failed.",
      };
    }
    invoiceId = invoice?.id ?? null;
  }

  return { campaignId, invoiceId, error: null };
}
