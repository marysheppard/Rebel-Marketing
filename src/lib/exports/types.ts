/** Extensible export formats — add new formats here and in the registry. */
export type ExportFormat = "csv" | "pdf";

export type ExportType =
  | "invoices"
  | "clients"
  | "contracts"
  | "profitability"
  | "campaigns";

/** UI / filter-facing contract status buckets (mapped to DB values). */
export type ContractStatusFilter =
  | "all"
  | "Active"
  | "Completed"
  | "Pending"
  | "Expired";

/** UI invoice status buckets. */
export type InvoiceStatusFilter =
  | "all"
  | "Paid"
  | "Pending"
  | "Overdue"
  | "Disputed";

/** UI campaign status buckets. */
export type CampaignStatusFilter =
  | "all"
  | "Planning"
  | "Active"
  | "Completed";

export type ExportFilters = {
  dateFrom?: string | null;
  dateTo?: string | null;
  clientId?: string | null;
  contractStatus?: ContractStatusFilter;
  invoiceStatus?: InvoiceStatusFilter;
  campaignStatus?: CampaignStatusFilter;
};

export type ExportRequest = {
  type: ExportType;
  format: ExportFormat;
  filters?: ExportFilters;
  /** Optional display name override for history. */
  name?: string;
  /** Optional client name hint (resolved to clientId by callers). */
  clientNameHint?: string;
};

export type ExportHistoryEntry = {
  id: string;
  name: string;
  type: ExportType;
  format: ExportFormat;
  generatedBy: string;
  generatedAt: string;
  rowCount: number;
};

export type ExportResult = {
  filename: string;
  mimeType: string;
  /** Browser download payload */
  blob: Blob;
  rowCount: number;
  name: string;
  type: ExportType;
  format: ExportFormat;
};

export const EXPORT_TYPE_LABELS: Record<ExportType, string> = {
  invoices: "Invoice Export",
  clients: "Client List Export",
  contracts: "Contract Report Export",
  profitability: "Profitability Report Export",
  campaigns: "Campaign Performance Report Export",
};

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: "CSV",
  pdf: "PDF",
};

export const EXPORT_FORMAT_MIME: Record<ExportFormat, string> = {
  csv: "text/csv;charset=utf-8",
  pdf: "application/pdf",
};
