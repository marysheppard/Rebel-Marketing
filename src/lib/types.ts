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
  created_at: string;
};

export type Client = {
  id: string;
  client_name: string;
  industry: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  status: string;
  account_manager_id: string | null;
  created_at: string;
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
  created_at: string;
  clients?: { client_name: string } | null;
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
  work_date: string;
  work_type: string;
  description: string;
  hours: number;
  billable: boolean;
  approval_status: string;
  billed: boolean;
  created_at: string;
  campaigns?: { campaign_name: string; client_id: string } | null;
  profiles?: { full_name: string } | null;
};

export type Cost = {
  id: string;
  campaign_id: string | null;
  contract_id: string | null;
  cost_type: string;
  description: string;
  amount: number;
  cost_date: string;
  vendor_name: string;
  approved: boolean;
  pass_through: boolean;
  created_at: string;
  campaigns?: { campaign_name: string; campaign_budget: number } | null;
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
