import { MARKETING_SERVICES } from "@/lib/client-intake";

export const BILLING_MODELS = [
  "Monthly Retainer",
  "Project Fee",
  "Hourly / Time and Materials",
  "Hybrid",
  "Campaign Billing",
  "Pass-Through",
  "Mixed",
] as const;

export const BILLING_FREQUENCIES = [
  "Monthly",
  "Quarterly",
  "Upon Milestone",
  "Upon Completion",
  "Net 15 invoicing cycle",
  "Net 30 invoicing cycle",
] as const;

export const AD_SPEND_TREATMENTS = [
  "Pass-Through (no markup)",
  "Pass-Through with markup",
  "Included in agency fees",
  "Client pays vendors directly",
] as const;

export const PAYMENT_TERMS_OPTIONS = [
  "Net 15",
  "Net 30",
  "Net 45",
  "Due on receipt",
  "50% deposit / 50% on completion",
] as const;

export type ContractBuilderValues = {
  client_id: string;
  contract_name: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  billing_method: string;
  service_types: string[];
  deliverables: string;
  scope: string;
  monthly_retainer: number;
  project_fee: number;
  billing_frequency: string;
  payment_terms: string;
  included_agency_hours: number;
  overage_hourly_rate: number;
  campaign_budget: number;
  advertising_spend_treatment: string;
  reimbursable_vendor_costs: boolean;
  pass_through_markup_pct: number;
  approval_required: boolean;
  spending_approval_threshold: number;
  renewal_option: boolean;
  renewal_terms: string;
  cancellation_notice_days: number;
  cancellation_terms: string;
  deposit_applicable: boolean;
  deposit_amount: number;
  notes: string;
};

export function defaultContractValues(clientId: string): ContractBuilderValues {
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date();
  end.setMonth(end.getMonth() + 12);
  return {
    client_id: clientId,
    contract_name: "",
    contract_number: `MSA-${Date.now().toString().slice(-8)}`,
    start_date: today,
    end_date: end.toISOString().slice(0, 10),
    billing_method: "Monthly Retainer",
    service_types: [],
    deliverables: "",
    scope: "",
    monthly_retainer: 0,
    project_fee: 0,
    billing_frequency: "Monthly",
    payment_terms: "Net 30",
    included_agency_hours: 0,
    overage_hourly_rate: 0,
    campaign_budget: 0,
    advertising_spend_treatment: "Pass-Through (no markup)",
    reimbursable_vendor_costs: true,
    pass_through_markup_pct: 0,
    approval_required: true,
    spending_approval_threshold: 0,
    renewal_option: true,
    renewal_terms: "",
    cancellation_notice_days: 30,
    cancellation_terms: "",
    deposit_applicable: false,
    deposit_amount: 0,
    notes: "",
  };
}

export function showsRetainer(billingMethod: string) {
  return ["Monthly Retainer", "Hybrid", "Mixed"].includes(billingMethod);
}

export function showsProjectFee(billingMethod: string) {
  return ["Project Fee", "Hybrid", "Mixed", "Campaign Billing"].includes(billingMethod);
}

export function showsHourly(billingMethod: string) {
  return ["Hourly / Time and Materials", "Hybrid", "Monthly Retainer"].includes(
    billingMethod,
  );
}

export function showsAdBudget(services: string[]) {
  return services.some((s) =>
    ["Paid Social Advertising", "Google / Search Advertising"].includes(s),
  );
}

/** New MSAs always start as Draft; finalize / send / signature flow advances status. */
export function deriveContractStatus(_start: string, _end: string) {
  return "Draft";
}

export function validateContractBuilder(values: ContractBuilderValues): string | null {
  if (!values.client_id) return "Client is required.";
  if (!values.contract_name.trim()) return "Contract name is required.";
  if (!values.contract_number.trim()) return "Contract number is required.";
  if (!values.start_date || !values.end_date) return "Contract dates are required.";
  if (values.end_date < values.start_date) return "End date must be on or after start date.";
  if (!values.billing_method) return "Billing model is required.";
  if (!values.service_types.length) return "Select at least one service type.";
  if (!values.deliverables.trim() && !values.scope.trim()) {
    return "Deliverables or scope are required.";
  }
  if (!values.payment_terms.trim()) return "Payment terms are required.";
  if (showsRetainer(values.billing_method) && values.monthly_retainer < 0) {
    return "Monthly retainer cannot be negative.";
  }
  if (showsProjectFee(values.billing_method) && values.project_fee < 0) {
    return "Project fee cannot be negative.";
  }
  if (values.included_agency_hours < 0 || values.overage_hourly_rate < 0) {
    return "Hours and rates cannot be negative.";
  }
  if (values.campaign_budget < 0 || values.pass_through_markup_pct < 0) {
    return "Budget and markup cannot be negative.";
  }
  if (values.cancellation_notice_days < 0) return "Cancellation notice days cannot be negative.";
  if (values.deposit_applicable && values.deposit_amount < 0) {
    return "Deposit cannot be negative.";
  }
  if (values.approval_required && values.spending_approval_threshold < 0) {
    return "Spending approval threshold cannot be negative.";
  }
  return null;
}

export function toContractInsertPayload(values: ContractBuilderValues) {
  const status = deriveContractStatus(values.start_date, values.end_date);
  return {
    client_id: values.client_id,
    contract_name: values.contract_name.trim(),
    contract_number: values.contract_number.trim(),
    start_date: values.start_date,
    end_date: values.end_date,
    contract_status: status,
    scope: values.scope.trim() || values.deliverables.trim(),
    billing_method: values.billing_method,
    monthly_retainer: showsRetainer(values.billing_method) ? values.monthly_retainer : 0,
    project_fee: showsProjectFee(values.billing_method) ? values.project_fee : 0,
    campaign_budget: values.campaign_budget,
    payment_terms: values.payment_terms.trim(),
    deposit_amount: values.deposit_applicable ? values.deposit_amount : 0,
    renewal_option: values.renewal_option,
    cancellation_terms:
      values.cancellation_terms.trim() ||
      `${values.cancellation_notice_days}-day written notice required.`,
    approval_required: values.approval_required,
    notes: values.notes.trim(),
    service_types: values.service_types,
    deliverables: values.deliverables.trim(),
    billing_frequency: values.billing_frequency,
    included_agency_hours: values.included_agency_hours,
    included_hours_monthly: values.included_agency_hours,
    overage_hourly_rate: values.overage_hourly_rate,
    advertising_spend_treatment: values.advertising_spend_treatment,
    reimbursable_vendor_costs: values.reimbursable_vendor_costs,
    pass_through_markup_pct: values.pass_through_markup_pct,
    spending_approval_threshold: values.spending_approval_threshold,
    renewal_terms: values.renewal_terms.trim(),
    cancellation_notice_days: values.cancellation_notice_days,
  };
}

export { MARKETING_SERVICES };
