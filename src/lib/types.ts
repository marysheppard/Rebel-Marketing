export type UserRole =
  | "agency_manager"
  | "account_manager"
  | "marketing"
  | "billing"
  | "client";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  weekly_hour_target: number | null;
  monthly_hour_target: number | null;
  created_at: string;
  /** Client must set a permanent password (after deferred OTP session). */
  must_change_password?: boolean;
  /** First OTP login may use the portal; cleared on logout so next login forces change. */
  password_change_deferred?: boolean;
};

export type TaskStatus =
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "Submitted"
  | "Approved"
  | "Needs Revision";

export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";

export type RetainerBucket = "Included" | "Overage" | "Not Applicable";

export type Task = {
  id: string;
  campaign_id: string;
  assignee_id: string;
  created_by: string | null;
  title: string;
  description: string;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  estimated_hours?: number;
  actual_hours?: number;
  assigned_date?: string;
  notes?: string;
  deliverable_notes: string;
  deliverable_url: string;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  campaigns?: {
    campaign_name: string;
    description?: string;
    client_id: string;
    contract_id?: string;
    clients?: { client_name: string } | null;
    contracts?: {
      contract_name: string;
      contract_number: string;
      scope: string;
      included_hours_monthly: number;
    } | null;
  } | null;
  profiles?: { full_name: string } | null;
};

export type CampaignAssignment = {
  id: string;
  campaign_id: string;
  user_id: string;
  created_at: string;
  campaigns?: {
    id: string;
    campaign_name: string;
    campaign_status: string;
    start_date: string;
    end_date: string;
    client_id: string;
    clients?: { client_name: string } | null;
  } | null;
};

export type Client = {
  id: string;
  customer_id: string;
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
  contact_name: string;
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
  expected_start_date: string | null;
  engagement_length: string;
  estimated_monthly_marketing_budget: number;
  estimated_monthly_advertising_budget: number;
  status: string;
  portal_status: string;
  account_manager_id: string | null;
  created_at: string;
  updated_at?: string;
};

export type Contract = {
  id: string;
  client_id: string;
  contract_name: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  contract_status: string;
  scope: string;
  billing_method: string;
  monthly_retainer: number;
  project_fee: number;
  campaign_budget: number;
  payment_terms: string;
  deposit_amount: number;
  renewal_option: boolean;
  cancellation_terms: string;
  approval_required: boolean;
  notes: string;
  included_hours_monthly: number;
  service_types: string[];
  deliverables: string;
  billing_frequency: string;
  included_agency_hours: number;
  overage_hourly_rate: number;
  advertising_spend_treatment: string;
  reimbursable_vendor_costs: boolean;
  pass_through_markup_pct: number;
  spending_approval_threshold: number;
  renewal_terms: string;
  cancellation_notice_days: number;
  agreement_html: string;
  agreement_generated_at: string | null;
  agreement_locked?: boolean;
  current_version_number?: number;
  finalized_at?: string | null;
  finalized_by?: string | null;
  fully_executed_at?: string | null;
  client_signed_at?: string | null;
  client_signer_name?: string;
  client_signer_title?: string;
  agency_signed_at?: string | null;
  agency_signer_id?: string | null;
  agency_signer_name?: string;
  signed_agreement_html?: string;
  created_at: string;
  updated_at?: string;
  clients?: { client_name: string; customer_id?: string } | null;
};

export type ControlExceptionStatus = "Open" | "Under Review" | "Resolved";

export type ControlException = {
  id: string;
  fingerprint: string;
  exception_type: string;
  client_id: string | null;
  severity: "info" | "warning" | "error";
  description: string;
  detected_at: string;
  status: ControlExceptionStatus;
  assigned_reviewer_id: string | null;
  href?: string | null;
  updated_at: string;
  clients?: { client_name: string } | null;
  profiles?: { full_name: string } | null;
};

export type CampaignMetric = {
  id: string;
  campaign_id: string;
  metric_date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  created_at: string;
};

export type TimeEntry = {
  id: string;
  employee_id: string;
  task_id: string;
  work_entry_id: string | null;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  total_hours: number;
  description: string;
  created_at: string;
  updated_at: string;
  tasks?: {
    id: string;
    title: string;
    campaign_id: string;
    status: TaskStatus;
    campaigns?: {
      campaign_name: string;
      clients?: { client_name: string } | null;
    } | null;
  } | null;
};

export type Campaign = {
  id: string;
  client_id: string;
  contract_id: string;
  campaign_name: string;
  campaign_type: string;
  start_date: string;
  end_date: string;
  campaign_status: string;
  campaign_budget: number;
  project_fee: number;
  description: string;
  target_audience: string;
  created_at: string;
  clients?: { client_name: string } | null;
  contracts?: { contract_name: string; contract_number: string } | null;
};

export type WorkEntry = {
  id: string;
  campaign_id: string;
  user_id: string;
  task_id: string | null;
  work_date: string;
  work_type: string;
  description: string;
  hours: number;
  billable: boolean;
  out_of_scope: boolean;
  retainer_bucket: RetainerBucket;
  approval_status: string;
  billed: boolean;
  created_at: string;
  campaigns?: {
    campaign_name: string;
    client_id: string;
    clients?: { client_name: string } | null;
  } | null;
  profiles?: { full_name: string } | null;
  tasks?: { title: string } | null;
};

export const COST_CATEGORIES = [
  "Ad spend",
  "Vendor/freelancer costs",
  "Employee labor cost",
  "Reimbursable/pass-through expenses",
  "Software/tool subscription costs",
  "Stock media licensing",
  "Production costs",
  "Travel expenses",
  "Rush/overtime fees",
  "Platform/processing fees",
  "Other",
] as const;

export const COST_APPROVAL_STATUSES = ["Pending", "Approved", "Unapproved"] as const;

export type Cost = {
  id: string;
  client_id: string | null;
  campaign_id: string | null;
  contract_id: string | null;
  client_id?: string | null;
  cost_type: string;
  description: string;
  amount: number;
  cost_date: string;
  vendor_name: string;
  approved: boolean;
  approval_status: string;
  pass_through: boolean;
  entered_by: string | null;
  created_at: string;
  campaigns?: {
    campaign_name: string;
    campaign_budget: number;
    client_id?: string | null;
    contract_id?: string;
    clients?: { client_name: string } | { client_name: string }[] | null;
  } | null;
  clients?: { client_name: string } | null;
  contracts?: { contract_name: string; contract_number?: string } | null;
  profiles?: { full_name: string } | null;
};

export type Approval = {
  id: string;
  campaign_id: string;
  client_id: string;
  approval_type: string;
  description: string;
  requested_date: string;
  approved_date: string | null;
  approval_status: string;
  requested_by: string | null;
  approved_by: string | null;
  notes: string;
  created_at: string;
  campaigns?: { campaign_name: string } | null;
  clients?: { client_name: string } | null;
};

export type Invoice = {
  id: string;
  client_id: string;
  contract_id: string | null;
  campaign_id: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  pass_through_amount: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  disputed: boolean;
  notes: string;
  created_at: string;
  clients?: { client_name: string } | null;
  payments?: { amount: number }[] | null;
};

export type Payment = {
  id: string;
  invoice_id: string;
  client_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference: string;
  notes: string;
  created_at: string;
};

export type PtoRequest = {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  hours: number;
  reason: string;
  status: string;
  created_at: string;
};

export const ROLE_LABELS: Record<UserRole, string> = {
  agency_manager: "Agency Manager",
  account_manager: "Account Manager",
  marketing: "Marketing Team",
  billing: "Billing / Accounting",
  client: "Client",
};

export const DEMO_ACCOUNTS = [
  {
    email: "manager@rebel.demo",
    password: "DemoPass123!",
    label: "Agency Manager",
    role: "agency_manager" as UserRole,
  },
  {
    email: "am.jordan@rebel.demo",
    password: "DemoPass123!",
    label: "Account Manager",
    role: "account_manager" as UserRole,
  },
  {
    email: "creative.mia@rebel.demo",
    password: "DemoPass123!",
    label: "Marketing",
    role: "marketing" as UserRole,
  },
  {
    email: "billing@rebel.demo",
    password: "DemoPass123!",
    label: "Billing",
    role: "billing" as UserRole,
  },
  {
    email: "client.blueridge@rebel.demo",
    password: "DemoPass123!",
    label: "Client (Blue Ridge)",
    role: "client" as UserRole,
  },
] as const;

/** Demo employee IDs → auth credentials (password is DemoPass123!) */
export const EMPLOYEE_LOGIN_IDS: Record<
  string,
  { email: string; password: string; label: string }
> = {
  "EMP-1001": {
    email: "manager@rebel.demo",
    password: "DemoPass123!",
    label: "Agency Manager",
  },
  "EMP-1002": {
    email: "am.jordan@rebel.demo",
    password: "DemoPass123!",
    label: "Account Manager",
  },
  "EMP-1003": {
    email: "creative.mia@rebel.demo",
    password: "DemoPass123!",
    label: "Marketing",
  },
  "EMP-1004": {
    email: "billing@rebel.demo",
    password: "DemoPass123!",
    label: "Billing",
  },
};

/** Demo customer IDs ? auth credentials (access code is DemoPass123!) */
export const CUSTOMER_LOGIN_IDS: Record<
  string,
  { email: string; accessCode: string; label: string }
> = {
  "CUST-BLUERIDGE": {
    email: "client.blueridge@rebel.demo",
    accessCode: "DemoPass123!",
    label: "Blue Ridge",
  },
  "CUST-SUMMIT": {
    email: "client.summit@rebel.demo",
    accessCode: "DemoPass123!",
    label: "Summit",
  },
};

export function resolveEmployeeLogin(employeeId: string, password: string) {
  const key = employeeId.trim().toUpperCase();
  const mapped = EMPLOYEE_LOGIN_IDS[key];
  if (mapped) {
    return { email: mapped.email, password };
  }
  const asEmail = employeeId.trim();
  if (asEmail.includes("@")) {
    return { email: asEmail, password };
  }
  return null;
}

export function resolveCustomerLogin(customerId: string, accessCode: string) {
  const key = customerId.trim().toUpperCase();
  const mapped = CUSTOMER_LOGIN_IDS[key];
  if (mapped) {
    return { email: mapped.email, password: accessCode };
  }
  const asEmail = customerId.trim();
  if (asEmail.includes("@")) {
    return { email: asEmail, password: accessCode };
  }
  return null;
}
