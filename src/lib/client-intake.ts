export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
] as const;

export const INDUSTRIES = [
  "Advertising / Media",
  "Automotive",
  "Consumer Products",
  "Ecommerce",
  "Education",
  "Financial Services",
  "Healthcare",
  "Hospitality / Travel",
  "Legal",
  "Nonprofit",
  "Professional Services",
  "Real Estate",
  "Retail",
  "Technology",
  "Other",
] as const;

export const MARKETING_SERVICES = [
  "Social Media Management",
  "Paid Social Advertising",
  "Google / Search Advertising",
  "Content Creation",
  "Graphic Design",
  "Branding",
  "SEO",
  "Email Marketing",
  "Website / Landing Page Services",
  "Marketing Strategy / Consulting",
  "Other",
] as const;

export const MARKETING_OBJECTIVES = [
  "Brand Awareness",
  "Lead Generation",
  "Sales / Conversions",
  "Customer Engagement",
  "Website Traffic",
  "Product / Service Launch",
  "Social Media Growth",
  "Other",
] as const;

export const ENGAGEMENT_TYPES = [
  "Monthly Retainer",
  "Fixed-Fee Project",
  "Hourly / Time and Materials",
  "Hybrid",
  "Not Yet Determined",
] as const;

export const ENGAGEMENT_LENGTHS = [
  "One-Time Project",
  "3 Months",
  "6 Months",
  "12 Months",
  "Ongoing",
  "Not Yet Determined",
] as const;

export const CLIENT_STATUSES = [
  "Prospect",
  "Intake in Progress",
  "Ready for Contract",
  "Active Client",
  "Inactive",
] as const;

export type ClientIntakeValues = {
  client_name: string;
  dba_brand_name: string;
  industry: string;
  website: string;
  business_phone: string;
  street_address: string;
  address_line_2: string;
  city: string;
  state: string;
  zip_code: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_job_title: string;
  contact_email: string;
  contact_phone: string;
  authorized_approver: boolean;
  billing_same_as_primary: boolean;
  billing_first_name: string;
  billing_last_name: string;
  billing_job_title: string;
  billing_email: string;
  billing_phone: string;
  requested_services: string[];
  services_other: string;
  primary_objective: string;
  objective_other: string;
  client_notes: string;
  engagement_type: string;
  expected_start_date: string;
  engagement_length: string;
  estimated_monthly_marketing_budget: number;
  estimated_monthly_advertising_budget: number;
  status: string;
  account_manager_id: string | null;
};

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function isValidUsPhone(value: string) {
  return value.replace(/\D/g, "").length === 10;
}

export function isValidZip(value: string) {
  return /^\d{5}(-\d{4})?$/.test(value.trim());
}

export function validateClientIntake(values: ClientIntakeValues): string | null {
  if (!values.client_name.trim()) return "Legal Business Name is required.";
  if (!values.street_address.trim()) return "Street Address is required.";
  if (!values.city.trim()) return "City is required.";
  if (!values.state) return "State is required.";
  if (!isValidZip(values.zip_code)) return "Enter a valid ZIP Code (12345 or 12345-6789).";
  if (!values.contact_first_name.trim() || !values.contact_last_name.trim()) {
    return "Primary contact first and last name are required.";
  }
  if (!isValidEmail(values.contact_email)) return "Enter a valid primary contact email.";
  if (!isValidUsPhone(values.contact_phone)) {
    return "Enter a valid 10-digit primary contact phone number.";
  }
  if (!values.billing_same_as_primary) {
    if (!values.billing_first_name.trim() || !values.billing_last_name.trim()) {
      return "Billing contact first and last name are required.";
    }
    if (!isValidEmail(values.billing_email)) return "Enter a valid billing email.";
    if (!isValidUsPhone(values.billing_phone)) {
      return "Enter a valid 10-digit billing phone number.";
    }
  }
  if (!values.requested_services.length) return "Select at least one marketing service.";
  if (values.requested_services.includes("Other") && !values.services_other.trim()) {
    return "Describe the Other service.";
  }
  if (!values.primary_objective) return "Primary Marketing Objective is required.";
  if (values.primary_objective === "Other" && !values.objective_other.trim()) {
    return "Describe the Other marketing objective.";
  }
  if (values.estimated_monthly_marketing_budget < 0 || values.estimated_monthly_advertising_budget < 0) {
    return "Budget amounts cannot be negative.";
  }
  if (!values.status) return "Client Status is required.";
  return null;
}

export function toClientInsertPayload(values: ClientIntakeValues) {
  const contact_name = `${values.contact_first_name.trim()} ${values.contact_last_name.trim()}`.trim();
  const billing_same = values.billing_same_as_primary;
  return {
    client_name: values.client_name.trim(),
    dba_brand_name: values.dba_brand_name.trim(),
    industry: values.industry,
    website: values.website.trim(),
    business_phone: values.business_phone.trim(),
    street_address: values.street_address.trim(),
    address_line_2: values.address_line_2.trim(),
    city: values.city.trim(),
    state: values.state,
    zip_code: values.zip_code.trim(),
    contact_first_name: values.contact_first_name.trim(),
    contact_last_name: values.contact_last_name.trim(),
    contact_job_title: values.contact_job_title.trim(),
    contact_name,
    contact_email: values.contact_email.trim().toLowerCase(),
    contact_phone: values.contact_phone.trim(),
    authorized_approver: values.authorized_approver,
    billing_same_as_primary: billing_same,
    billing_first_name: billing_same ? values.contact_first_name.trim() : values.billing_first_name.trim(),
    billing_last_name: billing_same ? values.contact_last_name.trim() : values.billing_last_name.trim(),
    billing_job_title: billing_same ? values.contact_job_title.trim() : values.billing_job_title.trim(),
    billing_email: billing_same
      ? values.contact_email.trim().toLowerCase()
      : values.billing_email.trim().toLowerCase(),
    billing_phone: billing_same ? values.contact_phone.trim() : values.billing_phone.trim(),
    requested_services: values.requested_services,
    services_other: values.services_other.trim(),
    primary_objective: values.primary_objective,
    objective_other: values.objective_other.trim(),
    client_notes: values.client_notes.trim(),
    engagement_type: values.engagement_type,
    expected_start_date: values.expected_start_date || null,
    engagement_length: values.engagement_length,
    estimated_monthly_marketing_budget: values.estimated_monthly_marketing_budget || 0,
    estimated_monthly_advertising_budget: values.estimated_monthly_advertising_budget || 0,
    status: values.status,
    account_manager_id: values.account_manager_id,
  };
}
