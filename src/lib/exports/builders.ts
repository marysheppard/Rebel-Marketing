import { num } from "@/lib/format";
import { formatEmail, formatPhone } from "@/lib/contact-format";
import { paidAmount } from "@/lib/finance";
import { contractValue, type AccountingContract } from "@/lib/accounting";
import { isRecognizedRevenue } from "@/lib/metrics";
import {
  inDateRange,
  matchesCampaignStatus,
  matchesClientId,
  matchesContractStatus,
  matchesInvoiceStatus,
} from "@/lib/exports/filters";
import type { ExportFilters } from "@/lib/exports/types";
import { normalizeCostCategory } from "@/lib/costs/categories";

export type ExportClient = {
  id: string;
  client_name: string;
  industry: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  status: string;
  account_manager_id: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export type ExportContract = {
  id: string;
  client_id: string;
  contract_name: string;
  contract_number: string;
  billing_method: string;
  contract_status: string;
  start_date: string;
  end_date: string;
  payment_terms?: string | null;
  monthly_retainer: number | string;
  project_fee: number | string;
  campaign_budget: number | string;
  deposit_amount: number | string;
  auto_renew?: boolean | null;
};

export type ExportCampaign = {
  id: string;
  client_id: string;
  contract_id: string;
  campaign_name: string;
  campaign_status: string;
  campaign_budget: number | string;
  start_date: string;
  end_date: string;
};

export type ExportInvoice = {
  id: string;
  client_id: string;
  contract_id: string | null;
  campaign_id: string | null;
  invoice_number: string;
  status: string;
  invoice_date: string;
  due_date: string;
  subtotal: number | string;
  pass_through_amount: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  notes?: string | null;
  disputed?: boolean | null;
  payments?: { amount: number | string }[] | null;
};

export type ExportCost = {
  id: string;
  client_id: string | null;
  campaign_id: string | null;
  cost_type: string;
  amount: number | string;
  cost_date: string;
  description?: string | null;
  approved?: boolean | null;
};

export type ExportAssignment = {
  campaign_id: string;
  user_id: string;
};

export type ExportProfile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  weekly_hour_target?: number | null;
};

export type ExportWork = {
  user_id: string;
  campaign_id: string;
  hours: number | string;
  work_date: string;
  billable: boolean;
  approval_status: string;
};

export type ExportDataset = {
  clients: ExportClient[];
  contracts: ExportContract[];
  campaigns: ExportCampaign[];
  invoices: ExportInvoice[];
  costs: ExportCost[];
  payments: { id: string; client_id: string; invoice_id: string; amount: number | string; payment_date: string }[];
  assignments: ExportAssignment[];
  profiles: ExportProfile[];
  work?: ExportWork[];
  agencyName?: string;
};

function clientName(ds: ExportDataset, id: string) {
  return ds.clients.find((c) => c.id === id)?.client_name ?? "—";
}

function amName(ds: ExportDataset, amId: string | null) {
  if (!amId) return "—";
  return ds.profiles.find((p) => p.id === amId)?.full_name ?? "—";
}

function paymentTerms(c: ExportContract) {
  return c.payment_terms?.trim() || "Net 30";
}

export function buildInvoiceRows(ds: ExportDataset, filters: ExportFilters = {}) {
  return ds.invoices
    .filter((i) => matchesClientId(i.client_id, filters))
    .filter((i) => matchesInvoiceStatus(i.status, filters.invoiceStatus))
    .filter((i) => inDateRange(i.invoice_date, filters))
    .map((i) => {
      const contract = ds.contracts.find((c) => c.id === i.contract_id);
      const client = ds.clients.find((c) => c.id === i.client_id);
      const paid = paidAmount(i);
      return {
        "Invoice Number": i.invoice_number,
        "Invoice Date": i.invoice_date,
        "Due Date": i.due_date,
        Client: client?.client_name ?? "—",
        "Contact Name": client?.contact_name ?? "—",
        "Contact Email": formatEmail(client?.contact_email),
        "Contract Number": contract?.contract_number ?? "—",
        "Contract Name": contract?.contract_name ?? "—",
        Subtotal: num(i.subtotal).toFixed(2),
        "Pass-Through": num(i.pass_through_amount).toFixed(2),
        Tax: num(i.tax_amount).toFixed(2),
        Total: num(i.total_amount).toFixed(2),
        Paid: paid.toFixed(2),
        Status: i.status,
        "Payment Terms": contract ? paymentTerms(contract) : "Net 30",
      };
    });
}

export function buildClientRows(ds: ExportDataset, filters: ExportFilters = {}) {
  return ds.clients
    .filter((c) => matchesClientId(c.id, filters))
    .map((c) => {
      const contracts = ds.contracts.filter((ct) => ct.client_id === c.id);
      const activeContracts = contracts.filter((ct) =>
        matchesContractStatus(ct.contract_status, "Active"),
      );
      const totalContractValue = contracts.reduce(
        (s, ct) => s + contractValue(ct as AccountingContract),
        0,
      );
      const revenue = ds.invoices
        .filter((i) => i.client_id === c.id && isRecognizedRevenue(i.status))
        .filter((i) => inDateRange(i.invoice_date, filters))
        .reduce((s, i) => s + num(i.total_amount), 0);
      const lastInvoice = ds.invoices
        .filter((i) => i.client_id === c.id)
        .map((i) => i.invoice_date)
        .sort()
        .at(-1);
      const lastActivity =
        lastInvoice ||
        c.updated_at?.slice(0, 10) ||
        c.created_at?.slice(0, 10) ||
        "—";

      return {
        "Client Name": c.client_name,
        Industry: c.industry || "—",
        "Contact Name": c.contact_name || "—",
        "Contact Email": formatEmail(c.contact_email),
        "Contact Phone": formatPhone(c.contact_phone),
        "Account Manager": amName(ds, c.account_manager_id),
        "Active Contracts": activeContracts.length,
        "Total Contract Value": totalContractValue.toFixed(2),
        "Revenue Generated": revenue.toFixed(2),
        "Client Status": c.status,
        "Last Activity Date": lastActivity,
      };
    });
}

export function buildContractRows(ds: ExportDataset, filters: ExportFilters = {}) {
  return ds.contracts
    .filter((c) => matchesClientId(c.client_id, filters))
    .filter((c) => matchesContractStatus(c.contract_status, filters.contractStatus))
    .filter(
      (c) =>
        inDateRange(c.start_date, filters) || inDateRange(c.end_date, filters),
    )
    .map((c) => ({
      "Contract ID": c.contract_number || c.id,
      Client: clientName(ds, c.client_id),
      "Contract Type": c.billing_method,
      "Start Date": c.start_date,
      "End Date": c.end_date,
      "Contract Value": contractValue(c as AccountingContract).toFixed(2),
      "Payment Terms": paymentTerms(c),
      Status: c.contract_status,
      Renewal: c.auto_renew
        ? "Auto-renew"
        : c.contract_status === "Pending Renewal"
          ? "Pending renewal"
          : "Manual / none",
      "Contract Name": c.contract_name,
    }));
}

export type ProfitabilityRow = {
  Campaign: string;
  Client: string;
  Revenue: number;
  "Labor Costs": number;
  Advertising: number;
  Software: number;
  "Other Costs": number;
  "Total Costs": number;
  Profit: number;
  "Margin %": number | null;
};

export function buildProfitabilityRows(
  ds: ExportDataset,
  filters: ExportFilters = {},
): ProfitabilityRow[] {
  const camps = ds.campaigns
    .filter((c) => matchesClientId(c.client_id, filters))
    .filter((c) => matchesCampaignStatus(c.campaign_status, filters.campaignStatus));

  return camps.map((camp) => {
    const revenue = ds.invoices
      .filter(
        (i) =>
          i.campaign_id === camp.id &&
          isRecognizedRevenue(i.status) &&
          inDateRange(i.invoice_date, filters),
      )
      .reduce((s, i) => s + num(i.total_amount), 0);

    let labor = 0;
    let advertising = 0;
    let software = 0;
    let other = 0;

    for (const cost of ds.costs) {
      if (cost.campaign_id !== camp.id) continue;
      if (!inDateRange(cost.cost_date, filters)) continue;
      const amt = num(cost.amount);
      const cat = normalizeCostCategory(cost.cost_type);
      if (cat === "employee_labor") labor += amt;
      else if (cat === "advertising") advertising += amt;
      else if (
        cost.cost_type === "Software/tool subscription costs" ||
        /software/i.test(cost.cost_type)
      ) {
        software += amt;
      } else other += amt;
    }

    const totalCosts = labor + advertising + software + other;
    const profit = revenue - totalCosts;
    const margin = revenue > 0 ? (profit / revenue) * 100 : null;

    return {
      Campaign: camp.campaign_name,
      Client: clientName(ds, camp.client_id),
      Revenue: revenue,
      "Labor Costs": labor,
      Advertising: advertising,
      Software: software,
      "Other Costs": other,
      "Total Costs": totalCosts,
      Profit: profit,
      "Margin %": margin,
    };
  });
}

export function buildCampaignRows(ds: ExportDataset, filters: ExportFilters = {}) {
  return ds.campaigns
    .filter((c) => matchesClientId(c.client_id, filters))
    .filter((c) => matchesCampaignStatus(c.campaign_status, filters.campaignStatus))
    .map((camp) => {
      const budget = num(camp.campaign_budget);
      const spend = ds.costs
        .filter((c) => c.campaign_id === camp.id)
        .filter((c) => inDateRange(c.cost_date, filters))
        .reduce((s, c) => s + num(c.amount), 0);
      const revenue = ds.invoices
        .filter(
          (i) =>
            i.campaign_id === camp.id &&
            isRecognizedRevenue(i.status) &&
            inDateRange(i.invoice_date, filters),
        )
        .reduce((s, i) => s + num(i.total_amount), 0);
      const profit = revenue - spend;
      const completion =
        budget > 0 ? Math.min(100, (spend / budget) * 100) : null;
      const team = ds.assignments
        .filter((a) => a.campaign_id === camp.id)
        .map((a) => ds.profiles.find((p) => p.id === a.user_id)?.full_name)
        .filter(Boolean)
        .join("; ");

      return {
        "Campaign Name": camp.campaign_name,
        Client: clientName(ds, camp.client_id),
        Budget: budget.toFixed(2),
        "Actual Spend": spend.toFixed(2),
        "Completion %":
          completion == null ? "—" : `${completion.toFixed(1)}%`,
        "Revenue Generated": revenue.toFixed(2),
        Profitability: profit.toFixed(2),
        "Assigned Team": team || "—",
        Status: camp.campaign_status,
      };
    });
}

export function buildRevenueRows(ds: ExportDataset, filters: ExportFilters = {}) {
  return ds.invoices
    .filter((i) => matchesClientId(i.client_id, filters))
    .filter((i) => matchesInvoiceStatus(i.status, filters.invoiceStatus))
    .filter((i) => inDateRange(i.invoice_date, filters))
    .map((i) => {
      const paid = paidAmount(i);
      return {
        "Invoice Number": i.invoice_number,
        Client: clientName(ds, i.client_id),
        "Invoice Date": i.invoice_date,
        Status: i.status,
        "Invoice Total": num(i.total_amount).toFixed(2),
        "Payments Received": paid.toFixed(2),
        "Remaining Balance": Math.max(0, num(i.total_amount) - paid).toFixed(2),
        Recognized: isRecognizedRevenue(i.status) ? "Yes" : "No",
      };
    });
}

export function buildUtilizationRows(
  ds: ExportDataset,
  filters: ExportFilters = {},
) {
  const work = ds.work ?? [];
  const employees = ds.profiles.filter((p) => p.role !== "client");

  return employees.map((p) => {
    const entries = work.filter(
      (w) =>
        w.user_id === p.id &&
        inDateRange(w.work_date, filters) &&
        (!filters.clientId ||
          ds.campaigns.some(
            (c) => c.id === w.campaign_id && c.client_id === filters.clientId,
          )),
    );
    const hours = entries.reduce((s, w) => s + num(w.hours), 0);
    const billableHours = entries
      .filter((w) => w.billable)
      .reduce((s, w) => s + num(w.hours), 0);
    const target = num(p.weekly_hour_target ?? 40);
    // Approximate weeks in filter (min 1)
    let weeks = 1;
    if (filters.dateFrom && filters.dateTo) {
      const a = new Date(filters.dateFrom).getTime();
      const b = new Date(filters.dateTo).getTime();
      weeks = Math.max(1, Math.ceil((b - a) / (7 * 24 * 3600 * 1000)));
    }
    const capacity = target * weeks;
    const utilization = capacity > 0 ? (hours / capacity) * 100 : null;

    return {
      Employee: p.full_name,
      Role: p.role,
      "Hours Logged": hours.toFixed(1),
      "Billable Hours": billableHours.toFixed(1),
      "Weekly Target": target.toFixed(1),
      "Period Capacity": capacity.toFixed(1),
      "Utilization %":
        utilization == null ? "—" : `${utilization.toFixed(1)}%`,
    };
  });
}

export function buildFinancialSummaryRows(
  ds: ExportDataset,
  filters: ExportFilters = {},
) {
  const invoices = ds.invoices
    .filter((i) => matchesClientId(i.client_id, filters))
    .filter((i) => inDateRange(i.invoice_date, filters));
  const recognized = invoices.filter((i) => isRecognizedRevenue(i.status));
  const revenue = recognized.reduce((s, i) => s + num(i.total_amount), 0);
  const collected = invoices.reduce((s, i) => s + paidAmount(i), 0);
  const costs = ds.costs
    .filter(
      (c) =>
        matchesClientId(c.client_id, filters) &&
        inDateRange(c.cost_date, filters),
    )
    .reduce((s, c) => s + num(c.amount), 0);
  const ar = invoices.reduce(
    (s, i) => s + Math.max(0, num(i.total_amount) - paidAmount(i)),
    0,
  );
  const profit = revenue - costs;
  const margin = revenue > 0 ? (profit / revenue) * 100 : null;

  return [
    { Metric: "Recognized revenue", Amount: revenue.toFixed(2) },
    { Metric: "Payments collected", Amount: collected.toFixed(2) },
    { Metric: "Open AR (remaining)", Amount: ar.toFixed(2) },
    { Metric: "Total costs", Amount: costs.toFixed(2) },
    { Metric: "Gross profit", Amount: profit.toFixed(2) },
    {
      Metric: "Profit margin %",
      Amount: margin == null ? "—" : margin.toFixed(1),
    },
    { Metric: "Invoice count", Amount: String(invoices.length) },
    {
      Metric: "Active clients (in scope)",
      Amount: String(
        ds.clients.filter((c) => matchesClientId(c.id, filters)).length,
      ),
    },
  ];
}

export function moneyFmt(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}
