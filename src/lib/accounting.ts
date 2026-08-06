import { paidAmount, remainingBalance } from "@/lib/finance";
import { daysBetween, num } from "@/lib/format";
import { isRecognizedRevenue } from "@/lib/metrics";
import {
  milestonesByContract,
  sumRecognized,
  type MilestoneLike,
} from "@/lib/milestones";

export type AccountingContract = {
  id: string;
  client_id: string;
  contract_name: string;
  contract_number?: string;
  start_date: string;
  end_date: string;
  contract_status: string;
  billing_method: string;
  monthly_retainer: number | string;
  project_fee: number | string;
  campaign_budget: number | string;
  deposit_amount: number | string;
  overage_hourly_rate?: number | string | null;
  included_hours_monthly?: number | string | null;
};

export type AccountingInvoice = {
  id: string;
  client_id: string;
  contract_id: string | null;
  total_amount: number | string;
  status: string;
  due_date: string;
  invoice_date: string;
  payments?: { amount: number | string }[] | null;
};

export type AccountingWork = {
  campaign_id: string;
  hours: number | string;
  billable: boolean;
  billed: boolean;
  approval_status: string;
  work_date: string;
};

export type AccountingCampaign = {
  id: string;
  client_id: string;
  contract_id: string;
};

export type AccountingClient = {
  id: string;
  client_name: string;
};

/** Contract value estimate for management reporting. */
export function contractValue(contract: AccountingContract) {
  const retainer = num(contract.monthly_retainer);
  const fee = num(contract.project_fee);
  const budget = num(contract.campaign_budget);
  const months = Math.max(
    1,
    Math.ceil(
      daysBetween(contract.start_date, new Date(contract.end_date)) / 30,
    ) || 1,
  );
  if (retainer > 0) return retainer * months;
  if (fee > 0) return fee;
  if (budget > 0) return budget;
  return num(contract.deposit_amount);
}

function billingPeriodLabel(contract: AccountingContract) {
  return `${contract.start_date} → ${contract.end_date}`;
}

/**
 * Management revenue recognition estimate (not GAAP):
 * - Retainer: recognize monthly_retainer × elapsed months
 * - Project fee: approved milestone dollars when milestones exist for the contract’s campaigns;
 *   otherwise time-progress (elapsed days / total days)
 * - Plus partial labor recognition for approved billable hours
 * Soft-capped at max(contract value, amount billed)
 */
export function buildRevenueRecognitionRows(input: {
  clients: AccountingClient[];
  contracts: AccountingContract[];
  invoices: AccountingInvoice[];
  work: AccountingWork[];
  campaigns: AccountingCampaign[];
  milestones?: MilestoneLike[];
  defaultHourlyRate?: number;
}) {
  const {
    clients,
    contracts,
    invoices,
    work,
    campaigns,
    milestones = [],
    defaultHourlyRate = 150,
  } = input;
  const clientName = new Map(clients.map((c) => [c.id, c.client_name]));
  const campaignsByContract = new Map<string, string[]>();
  for (const c of campaigns) {
    const list = campaignsByContract.get(c.contract_id) ?? [];
    list.push(c.id);
    campaignsByContract.set(c.contract_id, list);
  }
  const msByContract = milestonesByContract(milestones, campaigns);

  return contracts.map((contract) => {
    const value = contractValue(contract);
    const contractInvoices = invoices.filter(
      (i) => i.contract_id === contract.id && isRecognizedRevenue(i.status),
    );
    const amountBilled = contractInvoices.reduce(
      (s, i) => s + num(i.total_amount),
      0,
    );
    const ar = contractInvoices.reduce((s, i) => s + remainingBalance(i), 0);
    const collected = contractInvoices.reduce((s, i) => s + paidAmount(i), 0);

    const campIds = new Set(campaignsByContract.get(contract.id) ?? []);
    const relatedWork = work.filter((w) => campIds.has(w.campaign_id));
    const approvedHours = relatedWork
      .filter((w) => w.billable && w.approval_status === "Approved")
      .reduce((s, w) => s + num(w.hours), 0);
    const rate = num(contract.overage_hourly_rate) || defaultHourlyRate;

    const end = new Date(contract.end_date);
    const now = new Date();
    const elapsedEnd = now < end ? now : end;
    const elapsedMonths = Math.max(
      0,
      Math.min(
        120,
        Math.ceil(daysBetween(contract.start_date, elapsedEnd) / 30) || 0,
      ),
    );
    const retainer = num(contract.monthly_retainer);
    const contractMilestones = msByContract.get(contract.id) ?? [];
    const hasMilestones = contractMilestones.length > 0;
    const milestoneRecognized = sumRecognized(contractMilestones);

    let recognized = 0;
    let recognitionMethod: "milestone" | "time" | "retainer" | "mixed" =
      "time";

    if (retainer > 0) {
      recognized += retainer * elapsedMonths;
      recognitionMethod = hasMilestones ? "mixed" : "retainer";
    }

    if (hasMilestones) {
      recognized += milestoneRecognized;
      if (retainer <= 0) recognitionMethod = "milestone";
    } else if (num(contract.project_fee) > 0 && retainer <= 0) {
      const totalDays = Math.max(1, daysBetween(contract.start_date, end));
      const doneDays = Math.min(
        totalDays,
        Math.max(0, daysBetween(contract.start_date, elapsedEnd)),
      );
      recognized += num(contract.project_fee) * (doneDays / totalDays);
      recognitionMethod = "time";
    }

    // Partial labor recognition (lighter when milestones drive project recognition)
    const laborFactor = hasMilestones ? 0.1 : 0.25;
    recognized += approvedHours * rate * laborFactor;
    recognized = Math.min(recognized, Math.max(value, amountBilled));

    const deferred = Math.max(0, amountBilled - recognized);
    const unbilled = Math.max(0, recognized - amountBilled);

    let paymentStatus = "None";
    if (amountBilled <= 0) paymentStatus = "Unbilled";
    else if (ar <= 0.01) paymentStatus = "Paid";
    else if (collected > 0) paymentStatus = "Partial";
    else if (
      contractInvoices.some(
        (i) => remainingBalance(i) > 0 && new Date(i.due_date) < now,
      )
    )
      paymentStatus = "Overdue";
    else paymentStatus = "Open";

    return {
      clientId: contract.client_id,
      clientName: clientName.get(contract.client_id) ?? "—",
      contractId: contract.id,
      contractName: contract.contract_name,
      contractNumber: contract.contract_number ?? "",
      contractValue: value,
      billingPeriod: billingPeriodLabel(contract),
      amountBilled,
      revenueRecognized: recognized,
      deferredRevenue: deferred,
      unbilledRevenue: unbilled,
      accountsReceivable: ar,
      paymentStatus,
      contractStatus: contract.contract_status,
      recognitionMethod,
      milestoneBacked: hasMilestones,
      milestoneRecognized,
    };
  });
}

export function sumRecognition(
  rows: ReturnType<typeof buildRevenueRecognitionRows>,
) {
  return rows.reduce(
    (acc, r) => {
      acc.billed += r.amountBilled;
      acc.recognized += r.revenueRecognized;
      acc.deferred += r.deferredRevenue;
      acc.unbilled += r.unbilledRevenue;
      acc.ar += r.accountsReceivable;
      return acc;
    },
    { billed: 0, recognized: 0, deferred: 0, unbilled: 0, ar: 0 },
  );
}
