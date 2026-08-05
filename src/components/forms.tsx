"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { num } from "@/lib/format";

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="alert alert-error text-sm">{message}</div>;
}

function FormSuccess({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="alert alert-success text-sm">{message}</div>;
}

type Option = { id: string; label: string };

export function CreateClientForm({
  accountManagers = [],
}: {
  accountManagers?: Option[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const client_name = String(fd.get("client_name") ?? "").trim();
    if (!client_name) {
      setError("Client name is required.");
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { error: insertError } = await supabase.from("clients").insert({
      client_name,
      industry: String(fd.get("industry") ?? "").trim(),
      contact_name: String(fd.get("contact_name") ?? "").trim(),
      contact_email: String(fd.get("contact_email") ?? "").trim(),
      contact_phone: String(fd.get("contact_phone") ?? "").trim(),
      status: String(fd.get("status") ?? "Active"),
      account_manager_id: String(fd.get("account_manager_id") ?? "") || null,
    });
    setLoading(false);
    if (insertError) {
      setError("Could not create client. Please check the details and try again.");
      return;
    }
    setSuccess("Client created.");
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form-grid grid gap-4 sm:grid-cols-2">
      <FormError message={error} />
      <FormSuccess message={success} />
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Client name *</span>
        <input name="client_name" className="input input-bordered w-full" required />
      </label>
      <label>
        <span className="text-sm font-medium">Industry</span>
        <input name="industry" className="input input-bordered w-full" />
      </label>
      <label>
        <span className="text-sm font-medium">Status</span>
        <select name="status" className="select select-bordered w-full" defaultValue="Active">
          <option>Active</option>
          <option>Inactive</option>
          <option>Prospect</option>
        </select>
      </label>
      <label>
        <span className="text-sm font-medium">Contact name</span>
        <input name="contact_name" className="input input-bordered w-full" />
      </label>
      <label>
        <span className="text-sm font-medium">Contact email</span>
        <input name="contact_email" type="email" className="input input-bordered w-full" />
      </label>
      <label>
        <span className="text-sm font-medium">Contact phone</span>
        <input name="contact_phone" className="input input-bordered w-full" />
      </label>
      {accountManagers.length > 0 ? (
        <label>
          <span className="text-sm font-medium">Account manager</span>
          <select name="account_manager_id" className="select select-bordered w-full" defaultValue="">
            <option value="">Unassigned</option>
            {accountManagers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving…" : "Create client"}
        </button>
      </div>
    </form>
  );
}

export function CreateContractForm({ clients }: { clients: Option[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const start_date = String(fd.get("start_date"));
    const end_date = String(fd.get("end_date"));
    const monthly_retainer = num(fd.get("monthly_retainer"));
    const project_fee = num(fd.get("project_fee"));
    const campaign_budget = num(fd.get("campaign_budget"));
    const deposit_amount = num(fd.get("deposit_amount"));

    if (end_date < start_date) {
      setError("End date must be on or after start date.");
      setLoading(false);
      return;
    }
    if (
      monthly_retainer < 0 ||
      project_fee < 0 ||
      campaign_budget < 0 ||
      deposit_amount < 0
    ) {
      setError("Amounts cannot be negative.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: insertError } = await supabase.from("contracts").insert({
      client_id: String(fd.get("client_id")),
      contract_name: String(fd.get("contract_name")).trim(),
      contract_number: String(fd.get("contract_number")).trim(),
      start_date,
      end_date,
      contract_status: String(fd.get("contract_status")),
      scope: String(fd.get("scope") ?? "").trim(),
      billing_method: String(fd.get("billing_method")),
      monthly_retainer,
      project_fee,
      campaign_budget,
      payment_terms: String(fd.get("payment_terms") ?? "").trim(),
      deposit_amount,
      renewal_option: fd.get("renewal_option") === "on",
      cancellation_terms: String(fd.get("cancellation_terms") ?? "").trim(),
      approval_required: fd.get("approval_required") === "on",
      notes: String(fd.get("notes") ?? "").trim(),
    });
    setLoading(false);
    if (insertError) {
      setError("Could not create contract. Please verify all required fields.");
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form-grid grid gap-4 sm:grid-cols-2">
      <FormError message={error} />
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Client *</span>
        <select name="client_id" className="select select-bordered w-full" required>
          <option value="">Select client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="text-sm font-medium">Contract name *</span>
        <input name="contract_name" className="input input-bordered w-full" required />
      </label>
      <label>
        <span className="text-sm font-medium">Contract number *</span>
        <input name="contract_number" className="input input-bordered w-full" required />
      </label>
      <label>
        <span className="text-sm font-medium">Start date *</span>
        <input name="start_date" type="date" className="input input-bordered w-full" required />
      </label>
      <label>
        <span className="text-sm font-medium">End date *</span>
        <input name="end_date" type="date" className="input input-bordered w-full" required />
      </label>
      <label>
        <span className="text-sm font-medium">Status</span>
        <select name="contract_status" className="select select-bordered w-full" defaultValue="Active">
          <option>Draft</option>
          <option>Active</option>
          <option>Pending Renewal</option>
          <option>Expired</option>
          <option>Canceled</option>
        </select>
      </label>
      <label>
        <span className="text-sm font-medium">Billing method *</span>
        <select name="billing_method" className="select select-bordered w-full" required>
          <option>Monthly Retainer</option>
          <option>Project Fee</option>
          <option>Campaign Billing</option>
          <option>Pass-Through</option>
          <option>Mixed</option>
        </select>
      </label>
      <label>
        <span className="text-sm font-medium">Monthly retainer</span>
        <input name="monthly_retainer" type="number" min={0} step="0.01" className="input input-bordered w-full" defaultValue={0} />
      </label>
      <label>
        <span className="text-sm font-medium">Project fee</span>
        <input name="project_fee" type="number" min={0} step="0.01" className="input input-bordered w-full" defaultValue={0} />
      </label>
      <label>
        <span className="text-sm font-medium">Campaign budget</span>
        <input name="campaign_budget" type="number" min={0} step="0.01" className="input input-bordered w-full" defaultValue={0} />
      </label>
      <label>
        <span className="text-sm font-medium">Deposit</span>
        <input name="deposit_amount" type="number" min={0} step="0.01" className="input input-bordered w-full" defaultValue={0} />
      </label>
      <label>
        <span className="text-sm font-medium">Payment terms</span>
        <input name="payment_terms" className="input input-bordered w-full" placeholder="Net 30" />
      </label>
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Scope</span>
        <textarea name="scope" className="textarea textarea-bordered w-full" rows={2} />
      </label>
      <label className="flex-row items-center gap-2 sm:col-span-2">
        <input name="renewal_option" type="checkbox" className="checkbox" />
        <span className="text-sm font-medium">Renewal option</span>
      </label>
      <label className="flex-row items-center gap-2 sm:col-span-2">
        <input name="approval_required" type="checkbox" className="checkbox" defaultChecked />
        <span className="text-sm font-medium">Client approval required</span>
      </label>
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Cancellation terms</span>
        <textarea name="cancellation_terms" className="textarea textarea-bordered w-full" rows={2} />
      </label>
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Notes</span>
        <textarea name="notes" className="textarea textarea-bordered w-full" rows={2} />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving…" : "Create contract"}
        </button>
      </div>
    </form>
  );
}

export function CreateCampaignForm({
  clients,
  contracts,
}: {
  clients: Option[];
  contracts: { id: string; label: string; client_id: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState("");

  const filteredContracts = contracts.filter((c) => !clientId || c.client_id === clientId);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const start_date = String(fd.get("start_date"));
    const end_date = String(fd.get("end_date"));
    const campaign_budget = num(fd.get("campaign_budget"));
    const project_fee = num(fd.get("project_fee"));

    if (end_date < start_date) {
      setError("End date must be on or after start date.");
      setLoading(false);
      return;
    }
    if (campaign_budget < 0 || project_fee < 0) {
      setError("Budget and fees cannot be negative.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: insertError } = await supabase.from("campaigns").insert({
      client_id: String(fd.get("client_id")),
      contract_id: String(fd.get("contract_id")),
      campaign_name: String(fd.get("campaign_name")).trim(),
      campaign_type: String(fd.get("campaign_type")),
      start_date,
      end_date,
      campaign_status: String(fd.get("campaign_status")),
      campaign_budget,
      project_fee,
      description: String(fd.get("description") ?? "").trim(),
      target_audience: String(fd.get("target_audience") ?? "").trim(),
    });
    setLoading(false);
    if (insertError) {
      setError("Could not create campaign. Please verify all required fields.");
      return;
    }
    (e.target as HTMLFormElement).reset();
    setClientId("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form-grid grid gap-4 sm:grid-cols-2">
      <FormError message={error} />
      <label>
        <span className="text-sm font-medium">Client *</span>
        <select
          name="client_id"
          className="select select-bordered w-full"
          required
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">Select client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="text-sm font-medium">Contract *</span>
        <select name="contract_id" className="select select-bordered w-full" required>
          <option value="">Select contract</option>
          {filteredContracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="text-sm font-medium">Campaign name *</span>
        <input name="campaign_name" className="input input-bordered w-full" required />
      </label>
      <label>
        <span className="text-sm font-medium">Type *</span>
        <select name="campaign_type" className="select select-bordered w-full" required>
          <option>Advertising</option>
          <option>Social Media</option>
          <option>Branding</option>
          <option>Content</option>
          <option>Email</option>
          <option>Website</option>
          <option>Other</option>
        </select>
      </label>
      <label>
        <span className="text-sm font-medium">Start date *</span>
        <input name="start_date" type="date" className="input input-bordered w-full" required />
      </label>
      <label>
        <span className="text-sm font-medium">End date *</span>
        <input name="end_date" type="date" className="input input-bordered w-full" required />
      </label>
      <label>
        <span className="text-sm font-medium">Status</span>
        <select name="campaign_status" className="select select-bordered w-full" defaultValue="Active">
          <option>Planned</option>
          <option>Active</option>
          <option>On Hold</option>
          <option>Completed</option>
          <option>Canceled</option>
          <option>Late</option>
        </select>
      </label>
      <label>
        <span className="text-sm font-medium">Budget</span>
        <input name="campaign_budget" type="number" min={0} step="0.01" className="input input-bordered w-full" defaultValue={0} />
      </label>
      <label>
        <span className="text-sm font-medium">Project fee</span>
        <input name="project_fee" type="number" min={0} step="0.01" className="input input-bordered w-full" defaultValue={0} />
      </label>
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Description</span>
        <textarea name="description" className="textarea textarea-bordered w-full" rows={2} />
      </label>
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Target audience</span>
        <input name="target_audience" className="input input-bordered w-full" />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving…" : "Create campaign"}
        </button>
      </div>
    </form>
  );
}

export function CreateWorkForm({
  campaigns,
  userId,
}: {
  campaigns: Option[];
  userId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const hours = num(fd.get("hours"));
    if (hours < 0) {
      setError("Hours cannot be negative.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: insertError } = await supabase.from("work_entries").insert({
      campaign_id: String(fd.get("campaign_id")),
      user_id: userId,
      work_date: String(fd.get("work_date")),
      work_type: String(fd.get("work_type")),
      description: String(fd.get("description") ?? "").trim(),
      hours,
      billable: fd.get("billable") === "on",
      approval_status: "Pending",
      billed: false,
    });
    setLoading(false);
    if (insertError) {
      setError("Could not log work. Please check the details and try again.");
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form-grid grid gap-4 sm:grid-cols-2">
      <FormError message={error} />
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Campaign *</span>
        <select name="campaign_id" className="select select-bordered w-full" required>
          <option value="">Select campaign</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="text-sm font-medium">Work date *</span>
        <input
          name="work_date"
          type="date"
          className="input input-bordered w-full"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </label>
      <label>
        <span className="text-sm font-medium">Work type *</span>
        <select name="work_type" className="select select-bordered w-full" required>
          <option>Social Media Posts</option>
          <option>Ad Creation</option>
          <option>Campaign Management</option>
          <option>Graphic Design</option>
          <option>Copywriting</option>
          <option>Client Meetings</option>
          <option>Strategy</option>
          <option>Website Work</option>
          <option>Analytics/Reporting</option>
          <option>Other</option>
        </select>
      </label>
      <label>
        <span className="text-sm font-medium">Hours *</span>
        <input name="hours" type="number" min={0} step="0.25" className="input input-bordered w-full" required defaultValue={1} />
      </label>
      <label className="flex-row items-center gap-2">
        <input name="billable" type="checkbox" className="checkbox" defaultChecked />
        <span className="text-sm font-medium">Billable</span>
      </label>
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Description</span>
        <textarea name="description" className="textarea textarea-bordered w-full" rows={2} />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving…" : "Log work"}
        </button>
      </div>
    </form>
  );
}

export function CreateCostForm({ campaigns }: { campaigns: Option[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const amount = num(fd.get("amount"));
    if (amount < 0) {
      setError("Amount cannot be negative.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: insertError } = await supabase.from("costs").insert({
      campaign_id: String(fd.get("campaign_id")),
      contract_id: null,
      cost_type: String(fd.get("cost_type")),
      description: String(fd.get("description") ?? "").trim(),
      amount,
      cost_date: String(fd.get("cost_date")),
      vendor_name: String(fd.get("vendor_name") ?? "").trim(),
      approved: fd.get("approved") === "on",
      pass_through: fd.get("pass_through") === "on",
    });
    setLoading(false);
    if (insertError) {
      setError("Could not record cost. Please check the details and try again.");
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form-grid grid gap-4 sm:grid-cols-2">
      <FormError message={error} />
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Campaign *</span>
        <select name="campaign_id" className="select select-bordered w-full" required>
          <option value="">Select campaign</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="text-sm font-medium">Cost type *</span>
        <select name="cost_type" className="select select-bordered w-full" required>
          <option>Employee Labor</option>
          <option>Contractor</option>
          <option>Advertising Spend</option>
          <option>Software</option>
          <option>Production</option>
          <option>Travel</option>
          <option>Materials</option>
          <option>Vendor</option>
          <option>Pass-Through</option>
          <option>Other</option>
        </select>
      </label>
      <label>
        <span className="text-sm font-medium">Amount *</span>
        <input name="amount" type="number" min={0} step="0.01" className="input input-bordered w-full" required />
      </label>
      <label>
        <span className="text-sm font-medium">Cost date *</span>
        <input
          name="cost_date"
          type="date"
          className="input input-bordered w-full"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </label>
      <label>
        <span className="text-sm font-medium">Vendor</span>
        <input name="vendor_name" className="input input-bordered w-full" />
      </label>
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Description</span>
        <textarea name="description" className="textarea textarea-bordered w-full" rows={2} />
      </label>
      <label className="flex-row items-center gap-2">
        <input name="pass_through" type="checkbox" className="checkbox" />
        <span className="text-sm font-medium">Pass-through to client</span>
      </label>
      <label className="flex-row items-center gap-2">
        <input name="approved" type="checkbox" className="checkbox" />
        <span className="text-sm font-medium">Approved</span>
      </label>
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving…" : "Record cost"}
        </button>
      </div>
    </form>
  );
}

export function CreateApprovalForm({
  campaigns,
  userId,
}: {
  campaigns: { id: string; label: string; client_id: string }[];
  userId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const campaignId = String(fd.get("campaign_id"));
    const camp = campaigns.find((c) => c.id === campaignId);
    if (!camp) {
      setError("Please select a campaign.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: insertError } = await supabase.from("approvals").insert({
      campaign_id: campaignId,
      client_id: camp.client_id,
      approval_type: String(fd.get("approval_type")),
      description: String(fd.get("description")).trim(),
      requested_date: new Date().toISOString().slice(0, 10),
      approval_status: "Pending",
      requested_by: userId,
      notes: String(fd.get("notes") ?? "").trim(),
    });
    setLoading(false);
    if (insertError) {
      setError("Could not create approval request.");
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form-grid grid gap-4 sm:grid-cols-2">
      <FormError message={error} />
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Campaign *</span>
        <select name="campaign_id" className="select select-bordered w-full" required>
          <option value="">Select campaign</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="text-sm font-medium">Approval type *</span>
        <select name="approval_type" className="select select-bordered w-full" required>
          <option>Creative</option>
          <option>Budget</option>
          <option>Scope Change</option>
          <option>Launch</option>
          <option>Final Deliverable</option>
        </select>
      </label>
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Description *</span>
        <textarea name="description" className="textarea textarea-bordered w-full" rows={2} required />
      </label>
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Notes</span>
        <textarea name="notes" className="textarea textarea-bordered w-full" rows={2} />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving…" : "Request approval"}
        </button>
      </div>
    </form>
  );
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function appendApprovalNote(existing: string, line: string) {
  const base = existing.trim();
  return base ? `${base}\n${line}` : line;
}

export function UpdateApprovalStatusForm({
  approvalId,
  currentStatus,
  currentNotes = "",
}: {
  approvalId: string;
  currentStatus: string;
  currentNotes?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [responseNote, setResponseNote] = useState("");

  async function updateStatus(status: string) {
    setError(null);
    setSuccess(null);
    const trimmed = responseNote.trim();
    if (
      (status === "Changes Requested" || status === "Rejected") &&
      !trimmed
    ) {
      setError("Please add a note explaining your decision.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload: {
      approval_status: string;
      approved_date: string | null;
      approved_by: string | null;
      notes?: string;
    } = {
      approval_status: status,
      approved_date: status === "Approved" ? todayStamp() : null,
      approved_by: status === "Approved" ? user?.id ?? null : null,
    };

    if (trimmed) {
      payload.notes = appendApprovalNote(
        currentNotes,
        `[Client · ${status} · ${todayStamp()}] ${trimmed}`,
      );
    }

    const { error: updateError } = await supabase
      .from("approvals")
      .update(payload)
      .eq("id", approvalId);
    setLoading(false);
    if (updateError) {
      setError("Could not update approval status.");
      return;
    }
    setResponseNote("");
    const message =
      status === "Approved"
        ? "Approved."
        : status === "Changes Requested"
          ? "Changes requested."
          : "Rejected.";
    setSuccess(message);
    window.setTimeout(() => {
      router.refresh();
    }, 1000);
  }

  if (success) {
    return (
      <div className="flex flex-col gap-2">
        <FormSuccess message={success} />
      </div>
    );
  }

  if (currentStatus !== "Pending") return null;

  return (
    <div className="flex flex-col gap-2">
      <FormError message={error} />
      <label>
        <span className="mb-1 block text-xs font-medium opacity-70">
          Your response note (required for changes or reject)
        </span>
        <textarea
          className="textarea textarea-bordered textarea-sm w-full min-w-[12rem]"
          rows={2}
          value={responseNote}
          onChange={(e) => setResponseNote(e.target.value)}
          placeholder="Optional for Approve; required for Changes / Reject"
          disabled={loading}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-success btn-sm"
          disabled={loading}
          onClick={() => updateStatus("Approved")}
        >
          Approve
        </button>
        <button
          type="button"
          className="btn btn-warning btn-sm"
          disabled={loading}
          onClick={() => updateStatus("Changes Requested")}
        >
          Request changes
        </button>
        <button
          type="button"
          className="btn btn-error btn-sm"
          disabled={loading}
          onClick={() => updateStatus("Rejected")}
        >
          Reject
        </button>
      </div>
    </div>
  );
}

export function ResubmitApprovalForm({
  approvalId,
  currentStatus,
  currentNotes = "",
}: {
  approvalId: string;
  currentStatus: string;
  currentNotes?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");

  async function resubmit() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    const supabase = createClient();
    const trimmed = note.trim();
    const nextNotes = trimmed
      ? appendApprovalNote(
          currentNotes,
          `[Staff · Resubmitted · ${todayStamp()}] ${trimmed}`,
        )
      : appendApprovalNote(
          currentNotes,
          `[Staff · Resubmitted · ${todayStamp()}] Ready for client review again.`,
        );

    const { error: updateError } = await supabase
      .from("approvals")
      .update({
        approval_status: "Pending",
        approved_date: null,
        approved_by: null,
        notes: nextNotes,
      })
      .eq("id", approvalId);
    setLoading(false);
    if (updateError) {
      setError("Could not resubmit approval.");
      return;
    }
    setNote("");
    setSuccess("Resubmitted for client review.");
    window.setTimeout(() => {
      router.refresh();
    }, 1000);
  }

  if (success) {
    return (
      <div className="flex flex-col gap-2">
        <FormSuccess message={success} />
      </div>
    );
  }

  if (currentStatus !== "Changes Requested") return null;

  return (
    <div className="flex flex-col gap-2">
      <FormError message={error} />
      <label>
        <span className="mb-1 block text-xs font-medium opacity-70">
          Resubmit note (optional)
        </span>
        <textarea
          className="textarea textarea-bordered textarea-sm w-full min-w-[12rem]"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What did you revise?"
          disabled={loading}
        />
      </label>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={loading}
        onClick={resubmit}
      >
        {loading ? "Resubmitting…" : "Resubmit for approval"}
      </button>
    </div>
  );
}

export function CreateInvoiceForm({
  clients,
  contracts,
  campaigns,
  unbilledWorkByCampaign,
}: {
  clients: Option[];
  contracts: { id: string; label: string; client_id: string }[];
  campaigns: { id: string; label: string; client_id: string }[];
  unbilledWorkByCampaign: Record<string, number>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [markWorkBilled, setMarkWorkBilled] = useState(true);

  const filteredContracts = contracts.filter((c) => !clientId || c.client_id === clientId);
  const filteredCampaigns = campaigns.filter((c) => !clientId || c.client_id === clientId);
  const unbilledHours = campaignId ? unbilledWorkByCampaign[campaignId] ?? 0 : 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const subtotal = num(fd.get("subtotal"));
    const pass_through_amount = num(fd.get("pass_through_amount"));
    const tax_amount = num(fd.get("tax_amount"));
    const total_amount = num(fd.get("total_amount")) || subtotal + pass_through_amount + tax_amount;

    if (subtotal < 0 || pass_through_amount < 0 || tax_amount < 0 || total_amount < 0) {
      setError("Amounts cannot be negative.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const selectedCampaignId = String(fd.get("campaign_id") ?? "") || null;
    const { data: invoice, error: insertError } = await supabase
      .from("invoices")
      .insert({
        client_id: String(fd.get("client_id")),
        contract_id: String(fd.get("contract_id") ?? "") || null,
        campaign_id: selectedCampaignId,
        invoice_number: String(fd.get("invoice_number")).trim(),
        invoice_date: String(fd.get("invoice_date")),
        due_date: String(fd.get("due_date")),
        subtotal,
        pass_through_amount,
        tax_amount,
        total_amount,
        status: String(fd.get("status")),
        disputed: false,
        notes: String(fd.get("notes") ?? "").trim(),
      })
      .select("id")
      .single();

    if (insertError || !invoice) {
      setLoading(false);
      setError("Could not create invoice. Please verify all required fields.");
      return;
    }

    if (markWorkBilled && selectedCampaignId) {
      await supabase
        .from("work_entries")
        .update({ billed: true })
        .eq("campaign_id", selectedCampaignId)
        .eq("billable", true)
        .eq("billed", false)
        .eq("approval_status", "Approved");
    }

    setLoading(false);
    (e.target as HTMLFormElement).reset();
    setClientId("");
    setCampaignId("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form-grid grid gap-4 sm:grid-cols-2">
      <FormError message={error} />
      <label>
        <span className="text-sm font-medium">Client *</span>
        <select
          name="client_id"
          className="select select-bordered w-full"
          required
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            setCampaignId("");
          }}
        >
          <option value="">Select client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="text-sm font-medium">Invoice number *</span>
        <input
          name="invoice_number"
          className="input input-bordered w-full"
          required
          defaultValue={`INV-${Date.now().toString().slice(-8)}`}
        />
      </label>
      <label>
        <span className="text-sm font-medium">Contract</span>
        <select name="contract_id" className="select select-bordered w-full" defaultValue="">
          <option value="">None</option>
          {filteredContracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="text-sm font-medium">Campaign</span>
        <select
          name="campaign_id"
          className="select select-bordered w-full"
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
        >
          <option value="">None</option>
          {filteredCampaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="text-sm font-medium">Invoice date *</span>
        <input
          name="invoice_date"
          type="date"
          className="input input-bordered w-full"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </label>
      <label>
        <span className="text-sm font-medium">Due date *</span>
        <input name="due_date" type="date" className="input input-bordered w-full" required />
      </label>
      <label>
        <span className="text-sm font-medium">Subtotal *</span>
        <input name="subtotal" type="number" min={0} step="0.01" className="input input-bordered w-full" required />
      </label>
      <label>
        <span className="text-sm font-medium">Pass-through</span>
        <input name="pass_through_amount" type="number" min={0} step="0.01" className="input input-bordered w-full" defaultValue={0} />
      </label>
      <label>
        <span className="text-sm font-medium">Tax</span>
        <input name="tax_amount" type="number" min={0} step="0.01" className="input input-bordered w-full" defaultValue={0} />
      </label>
      <label>
        <span className="text-sm font-medium">Total</span>
        <input name="total_amount" type="number" min={0} step="0.01" className="input input-bordered w-full" placeholder="Auto-calculated if blank" />
      </label>
      <label>
        <span className="text-sm font-medium">Status</span>
        <select name="status" className="select select-bordered w-full" defaultValue="Draft">
          <option>Draft</option>
          <option>Sent</option>
          <option>Partially Paid</option>
          <option>Paid</option>
          <option>Overdue</option>
          <option>Disputed</option>
          <option>Canceled</option>
        </select>
      </label>
      {campaignId && unbilledHours > 0 ? (
        <label className="flex-row items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            className="checkbox"
            checked={markWorkBilled}
            onChange={(e) => setMarkWorkBilled(e.target.checked)}
          />
          <span className="text-sm font-medium">
            Mark {unbilledHours.toFixed(1)}h of approved unbilled work as billed
          </span>
        </label>
      ) : null}
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Notes</span>
        <textarea name="notes" className="textarea textarea-bordered w-full" rows={2} />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving…" : "Create invoice"}
        </button>
      </div>
    </form>
  );
}

export function RecordPaymentForm({
  invoices,
}: {
  invoices: {
    id: string;
    label: string;
    client_id: string;
    remaining: number;
  }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");

  const selected = invoices.find((i) => i.id === invoiceId);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const amount = num(fd.get("amount"));
    const inv = invoices.find((i) => i.id === String(fd.get("invoice_id")));

    if (!inv) {
      setError("Please select an invoice.");
      setLoading(false);
      return;
    }
    if (amount <= 0) {
      setError("Payment amount must be greater than zero.");
      setLoading(false);
      return;
    }
    if (amount > inv.remaining) {
      setError(`Payment cannot exceed remaining balance of $${inv.remaining.toFixed(2)}.`);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: payError } = await supabase.from("payments").insert({
      invoice_id: inv.id,
      client_id: inv.client_id,
      payment_date: String(fd.get("payment_date")),
      amount,
      payment_method: String(fd.get("payment_method")),
      reference: String(fd.get("reference") ?? "").trim(),
      notes: String(fd.get("notes") ?? "").trim(),
    });

    if (payError) {
      setLoading(false);
      setError("Could not record payment.");
      return;
    }

    const newRemaining = inv.remaining - amount;
    let newStatus = "Partially Paid";
    if (newRemaining <= 0) newStatus = "Paid";

    await supabase.from("invoices").update({ status: newStatus }).eq("id", inv.id);

    setLoading(false);
    (e.target as HTMLFormElement).reset();
    setInvoiceId("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form-grid grid gap-4 sm:grid-cols-2">
      <FormError message={error} />
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Invoice *</span>
        <select
          name="invoice_id"
          className="select select-bordered w-full"
          required
          value={invoiceId}
          onChange={(e) => setInvoiceId(e.target.value)}
        >
          <option value="">Select invoice</option>
          {invoices.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label} — ${i.remaining.toFixed(2)} remaining
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <p className="text-sm opacity-70 sm:col-span-2">
          Remaining balance: <strong>${selected.remaining.toFixed(2)}</strong>
        </p>
      ) : null}
      <label>
        <span className="text-sm font-medium">Payment date *</span>
        <input
          name="payment_date"
          type="date"
          className="input input-bordered w-full"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </label>
      <label>
        <span className="text-sm font-medium">Amount *</span>
        <input
          name="amount"
          type="number"
          min={0.01}
          step="0.01"
          max={selected?.remaining}
          className="input input-bordered w-full"
          required
        />
      </label>
      <label>
        <span className="text-sm font-medium">Method *</span>
        <select name="payment_method" className="select select-bordered w-full" required>
          <option>ACH</option>
          <option>Check</option>
          <option>Credit Card</option>
          <option>Other</option>
        </select>
      </label>
      <label>
        <span className="text-sm font-medium">Reference</span>
        <input name="reference" className="input input-bordered w-full" />
      </label>
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Notes</span>
        <textarea name="notes" className="textarea textarea-bordered w-full" rows={2} />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving…" : "Record payment"}
        </button>
      </div>
    </form>
  );
}

export function PtoRequestForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const start_date = String(fd.get("start_date") ?? "");
    const end_date = String(fd.get("end_date") ?? "");
    const hours = num(fd.get("hours"));
    const reason = String(fd.get("reason") ?? "").trim();

    if (!start_date || !end_date) {
      setError("Start and end dates are required.");
      setLoading(false);
      return;
    }
    if (end_date < start_date) {
      setError("End date must be on or after the start date.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: insertError } = await supabase.from("pto_requests").insert({
      user_id: userId,
      start_date,
      end_date,
      hours: hours || 8,
      reason,
      status: "Pending",
    });
    setLoading(false);
    if (insertError) {
      setError(insertError.message || "Could not submit PTO request.");
      return;
    }
    setSuccess("PTO request submitted.");
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form className="form-grid grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
      <FormError message={error} />
      <FormSuccess message={success} />
      <label>
        <span className="text-sm font-medium">Start date</span>
        <input
          name="start_date"
          type="date"
          className="input input-bordered w-full"
          required
        />
      </label>
      <label>
        <span className="text-sm font-medium">End date</span>
        <input
          name="end_date"
          type="date"
          className="input input-bordered w-full"
          required
        />
      </label>
      <label>
        <span className="text-sm font-medium">Hours</span>
        <input
          name="hours"
          type="number"
          min="0"
          step="0.5"
          defaultValue={8}
          className="input input-bordered w-full"
          required
        />
      </label>
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Reason</span>
        <textarea
          name="reason"
          className="textarea textarea-bordered w-full"
          rows={2}
          placeholder="Vacation, appointment, personal day…"
        />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Submitting…" : "Request PTO"}
        </button>
      </div>
    </form>
  );
}
