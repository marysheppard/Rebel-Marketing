import type {
  ExportContract,
  ExportDataset,
} from "@/lib/exports/builders";
import { downloadBlob } from "@/lib/exports/csv";
import { buildContractPdf } from "@/lib/exports/pdf";

/** Minimal contract fields needed to generate a PDF. */
export type ContractPdfRow = {
  id: string;
  contract_name: string;
  contract_number: string;
  client_id: string;
  client_name: string;
  contract_status: string;
  billing_method: string;
  monthly_retainer: number;
  project_fee: number;
  campaign_budget: number;
  start_date: string;
  end_date: string;
  payment_terms?: string | null;
  deposit_amount?: number;
  auto_renew?: boolean | null;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
};

export type ContractPdfContext = {
  agencyName?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  industry?: string;
};

export function rowToExportContract(row: ContractPdfRow): ExportContract {
  return {
    id: row.id,
    client_id: row.client_id,
    contract_name: row.contract_name,
    contract_number: row.contract_number,
    billing_method: row.billing_method,
    contract_status: row.contract_status,
    start_date: row.start_date,
    end_date: row.end_date,
    payment_terms: row.payment_terms ?? "Net 30",
    monthly_retainer: row.monthly_retainer,
    project_fee: row.project_fee,
    campaign_budget: row.campaign_budget,
    deposit_amount: row.deposit_amount ?? 0,
    auto_renew: row.auto_renew ?? null,
  };
}

export function buildDatasetForContractPdf(
  row: ContractPdfRow,
  ctx: ContractPdfContext = {},
): { dataset: ExportDataset; contract: ExportContract } {
  const contract = rowToExportContract(row);
  const dataset: ExportDataset = {
    agencyName: ctx.agencyName ?? "Rebel Marketing",
    clients: [
      {
        id: row.client_id,
        client_name: row.client_name,
        industry: ctx.industry ?? "",
        contact_name: ctx.contact_name ?? row.contact_name ?? "",
        contact_email: ctx.contact_email ?? row.contact_email ?? "",
        contact_phone: ctx.contact_phone ?? row.contact_phone ?? "",
        status: "",
        account_manager_id: null,
      },
    ],
    contracts: [contract],
    campaigns: [],
    invoices: [],
    costs: [],
    payments: [],
    assignments: [],
    profiles: [],
  };
  return { dataset, contract };
}

export async function downloadContractPdf(
  row: ContractPdfRow,
  ctx: ContractPdfContext = {},
): Promise<void> {
  const { dataset, contract } = buildDatasetForContractPdf(row, ctx);
  const bytes = buildContractPdf(dataset, contract);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: "application/pdf" });
  const name = (row.contract_number || row.contract_name || "contract")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-|-$/g, "");
  downloadBlob(blob, `${name || "contract"}.pdf`);
}
