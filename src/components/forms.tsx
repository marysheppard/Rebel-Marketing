"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { applyPayment } from "@/lib/billing/apply-payment";
import { money, num } from "@/lib/format";
import {
  overageAmount,
  overageHours,
  suggestedInvoiceSubtotal,
} from "@/lib/finance";

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
  tasks = [],
}: {
  campaigns: Option[];
  userId: string;
  tasks?: { id: string; label: string; campaign_id: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [campaignId, setCampaignId] = useState("");

  const filteredTasks = tasks.filter(
    (t) => !campaignId || t.campaign_id === campaignId,
  );

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

    const taskId = String(fd.get("task_id") ?? "").trim();
    const supabase = createClient();
    const { error: insertError } = await supabase.from("work_entries").insert({
      campaign_id: String(fd.get("campaign_id")),
      user_id: userId,
      task_id: taskId || null,
      work_date: String(fd.get("work_date")),
      work_type: String(fd.get("work_type")),
      description: String(fd.get("description") ?? "").trim(),
      hours,
      billable: fd.get("billable") === "on",
      out_of_scope: fd.get("out_of_scope") === "on",
      retainer_bucket: String(fd.get("retainer_bucket") ?? "Not Applicable"),
      approval_status: "Pending",
      billed: false,
    });
    setLoading(false);
    if (insertError) {
      setError("Could not log work. Please check the details and try again.");
      return;
    }
    (e.target as HTMLFormElement).reset();
    setCampaignId("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form-grid grid gap-4 sm:grid-cols-2">
      <FormError message={error} />
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Campaign / client work *</span>
        <select
          name="campaign_id"
          className="select select-bordered w-full"
          required
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
        >
          <option value="">Select campaign</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Related task (optional)</span>
        <select name="task_id" className="select select-bordered w-full">
          <option value="">No specific task</option>
          {filteredTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
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
        <input
          name="hours"
          type="number"
          min={0}
          step="0.25"
          className="input input-bordered w-full"
          required
          defaultValue={1}
        />
      </label>
      <label>
        <span className="text-sm font-medium">Retainer hours bucket</span>
        <select
          name="retainer_bucket"
          className="select select-bordered w-full"
          defaultValue="Not Applicable"
        >
          <option>Not Applicable</option>
          <option>Included</option>
          <option>Overage</option>
        </select>
      </label>
      <label className="flex-row items-center gap-2">
        <input name="billable" type="checkbox" className="checkbox" defaultChecked />
        <span className="text-sm font-medium">Billable</span>
      </label>
      <label className="flex-row items-center gap-2">
        <input name="out_of_scope" type="checkbox" className="checkbox" />
        <span className="text-sm font-medium">
          Outside original scope (change-order review)
        </span>
      </label>
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Description of work performed</span>
        <textarea
          name="description"
          className="textarea textarea-bordered w-full"
          rows={2}
        />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving…" : "Log work"}
        </button>
      </div>
    </form>
  );
}

export function UpdateTaskStatusForm({
  taskId,
  currentStatus,
}: {
  taskId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const status = String(fd.get("status"));
    if (status === "Approved") {
      setError("You cannot approve your own work.");
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", taskId);
    setLoading(false);
    if (updateError) {
      setError(updateError.message || "Could not update status.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <FormError message={error} />
      <label>
        <span className="text-sm font-medium">Status</span>
        <select
          name="status"
          className="select select-bordered w-full"
          defaultValue={currentStatus === "Approved" ? "Submitted" : currentStatus}
          required
        >
          <option>Not Started</option>
          <option>In Progress</option>
          <option>Submitted</option>
          <option>Needs Revision</option>
        </select>
      </label>
      <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
        {loading ? "Saving…" : "Save status"}
      </button>
    </form>
  );
}

export function SubmitTaskForm({
  taskId,
  defaultNotes = "",
  defaultUrl = "",
}: {
  taskId: string;
  defaultNotes?: string;
  defaultUrl?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        status: "Submitted",
        deliverable_notes: String(fd.get("deliverable_notes") ?? "").trim(),
        deliverable_url: String(fd.get("deliverable_url") ?? "").trim(),
        submitted_at: new Date().toISOString(),
      })
      .eq("id", taskId);
    setLoading(false);
    if (updateError) {
      setError(updateError.message || "Could not submit task.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <FormError message={error} />
      <label>
        <span className="text-sm font-medium">Deliverable link / file reference</span>
        <input
          name="deliverable_url"
          type="url"
          className="input input-bordered w-full"
          placeholder="https://…"
          defaultValue={defaultUrl}
        />
      </label>
      <label>
        <span className="text-sm font-medium">Deliverable notes / summary</span>
        <textarea
          name="deliverable_notes"
          className="textarea textarea-bordered w-full"
          rows={3}
          defaultValue={defaultNotes}
          required
        />
      </label>
      <button type="submit" className="btn btn-secondary btn-sm" disabled={loading}>
        {loading ? "Submitting…" : "Mark as submitted"}
      </button>
    </form>
  );
}

type CostCampaignOption = Option & {
  contract_id?: string | null;
  reimbursable_vendor_costs?: boolean;
  pass_through_markup_pct?: number;
  advertising_spend_treatment?: string;
  approval_required?: boolean;
  spending_approval_threshold?: number;
};

export function CreateCostForm({
  campaigns,
}: {
  campaigns: CostCampaignOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [campaignId, setCampaignId] = useState("");
  const [amount, setAmount] = useState("");
  const [passThrough, setPassThrough] = useState(false);
  const [approved, setApproved] = useState(false);

  const selected = campaigns.find((c) => c.id === campaignId);
  const markup = num(selected?.pass_through_markup_pct);
  const threshold = num(selected?.spending_approval_threshold);
  const treatment = selected?.advertising_spend_treatment || "";
  const amountNum = num(amount);
  const markedUp =
    passThrough && markup > 0 ? amountNum * (1 + markup / 100) : amountNum;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const amt = num(fd.get("amount"));
    const isPassThrough = fd.get("pass_through") === "on";
    const isApproved = fd.get("approved") === "on";
    const costType = String(fd.get("cost_type"));
    const camp = campaigns.find((c) => c.id === String(fd.get("campaign_id")));

    if (amt < 0) {
      setError("Amount cannot be negative.");
      setLoading(false);
      return;
    }

    if (isPassThrough && camp && camp.reimbursable_vendor_costs === false) {
      setError(
        "This contract does not allow reimbursable / pass-through vendor costs.",
      );
      setLoading(false);
      return;
    }

    if (
      costType === "Advertising Spend" &&
      treatment === "Client pays vendors directly" &&
      isPassThrough
    ) {
      setError(
        "Contract terms say the client pays ad vendors directly — do not mark advertising as pass-through.",
      );
      setLoading(false);
      return;
    }

    if (
      camp?.approval_required &&
      threshold > 0 &&
      amt >= threshold &&
      !isApproved
    ) {
      setError(
        `MSA requires client approval for spend of ${money(threshold)} or more. Check Approved or submit an approval request first.`,
      );
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const approved = fd.get("approved") === "on";
    const { error: insertError } = await supabase.from("costs").insert({
      campaign_id: String(fd.get("campaign_id")),
      contract_id: camp?.contract_id || null,
      cost_type: costType,
      description: String(fd.get("description") ?? "").trim(),
      amount: amt,
      cost_date: String(fd.get("cost_date")),
      vendor_name: String(fd.get("vendor_name") ?? "").trim(),
      approved,
      approval_status: approved ? "Approved" : "Pending",
      pass_through: fd.get("pass_through") === "on",
    });
    setLoading(false);
    if (insertError) {
      setError("Could not record cost. Please check the details and try again.");
      return;
    }
    (e.target as HTMLFormElement).reset();
    setCampaignId("");
    setAmount("");
    setPassThrough(false);
    setApproved(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form-grid grid gap-4 sm:grid-cols-2">
      <FormError message={error} />
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Campaign *</span>
        <select
          name="campaign_id"
          className="select select-bordered w-full"
          required
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
        >
          <option value="">Select campaign</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <div className="alert alert-info text-sm sm:col-span-2">
          Pass-through:{" "}
          {selected.reimbursable_vendor_costs === false
            ? "not allowed on this MSA"
            : `allowed${markup > 0 ? ` · ${markup}% markup` : " · no markup"}`}
          {treatment ? ` · Ad spend: ${treatment}` : ""}
          {selected.approval_required && threshold > 0
            ? ` · Approval required at ${money(threshold)}+`
            : ""}
        </div>
      ) : null}
      <label>
        <span className="text-sm font-medium">Cost type *</span>
        <select name="cost_type" className="select select-bordered w-full" required>
          <option>Ad spend</option>
          <option>Vendor/freelancer costs</option>
          <option>Employee labor cost</option>
          <option>Reimbursable/pass-through expenses</option>
          <option>Software/tool subscription costs</option>
          <option>Stock media licensing</option>
          <option>Production costs</option>
          <option>Travel expenses</option>
          <option>Rush/overtime fees</option>
          <option>Platform/processing fees</option>
          <option>Other</option>
        </select>
      </label>
      <label>
        <span className="text-sm font-medium">Amount *</span>
        <input
          name="amount"
          type="number"
          min={0}
          step="0.01"
          className="input input-bordered w-full"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {passThrough && markup > 0 && amountNum > 0 ? (
          <span className="mt-1 block text-xs opacity-70">
            Client billable with markup: {money(markedUp)}
          </span>
        ) : null}
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
        <input
          name="pass_through"
          type="checkbox"
          className="checkbox"
          checked={passThrough}
          onChange={(e) => setPassThrough(e.target.checked)}
          disabled={selected?.reimbursable_vendor_costs === false}
        />
        <span className="text-sm font-medium">Pass-through to client</span>
      </label>
      <label className="flex-row items-center gap-2">
        <input
          name="approved"
          type="checkbox"
          className="checkbox"
          checked={approved}
          onChange={(e) => setApproved(e.target.checked)}
        />
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
  campaigns: {
    id: string;
    label: string;
    client_id: string;
    approval_required?: boolean;
    spending_approval_threshold?: number;
  }[];
  userId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [campaignId, setCampaignId] = useState("");

  const selected = campaigns.find((c) => c.id === campaignId);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const selectedCampaignId = String(fd.get("campaign_id"));
    const camp = campaigns.find((c) => c.id === selectedCampaignId);
    if (!camp) {
      setError("Please select a campaign.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: insertError } = await supabase.from("approvals").insert({
      campaign_id: selectedCampaignId,
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
    setCampaignId("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form-grid grid gap-4 sm:grid-cols-2">
      <FormError message={error} />
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Campaign *</span>
        <select
          name="campaign_id"
          className="select select-bordered w-full"
          required
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
        >
          <option value="">Select campaign</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      {selected?.approval_required ? (
        <div className="alert alert-warning text-sm sm:col-span-2">
          MSA requires client approval
          {num(selected.spending_approval_threshold) > 0
            ? ` for spend of ${money(selected.spending_approval_threshold)} or more, and for deliverables.`
            : " for deliverables and material spend."}
        </div>
      ) : null}
      <label>
        <span className="text-sm font-medium">Approval type *</span>
        <select
          name="approval_type"
          className="select select-bordered w-full"
          required
          defaultValue={
            selected?.approval_required &&
            num(selected.spending_approval_threshold) > 0
              ? "Budget"
              : "Creative"
          }
          key={campaignId || "none"}
        >
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

export function UpdateApprovalStatusForm({
  approvalId,
  currentStatus,
}: {
  approvalId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: string) {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: updateError } = await supabase
      .from("approvals")
      .update({
        approval_status: status,
        approved_date: status === "Approved" ? new Date().toISOString().slice(0, 10) : null,
        approved_by: status === "Approved" ? user?.id ?? null : null,
      })
      .eq("id", approvalId);
    setLoading(false);
    if (updateError) {
      setError("Could not update approval status.");
      return;
    }
    router.refresh();
  }

  if (currentStatus !== "Pending") return null;

  return (
    <div className="flex flex-col gap-2">
      <FormError message={error} />
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

export function CreateInvoiceForm({
  clients,
  contracts,
  campaigns,
  unbilledWorkByCampaign,
  compact = false,
  onSuccess,
  onCancel,
}: {
  clients: Option[];
  contracts: {
    id: string;
    label: string;
    client_id: string;
    billing_method?: string;
    monthly_retainer?: number;
    project_fee?: number;
    included_agency_hours?: number;
    overage_hourly_rate?: number;
    logged_billable_hours?: number;
  }[];
  campaigns: { id: string; label: string; client_id: string }[];
  unbilledWorkByCampaign: Record<string, number>;
  compact?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState("");
  const [contractId, setContractId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [markWorkBilled, setMarkWorkBilled] = useState(true);
  const fieldClass = compact
    ? "input input-bordered input-sm w-full"
    : "input input-bordered w-full";
  const selectClass = compact
    ? "select select-bordered select-sm w-full"
    : "select select-bordered w-full";
  const textareaClass = compact
    ? "textarea textarea-bordered textarea-sm w-full"
    : "textarea textarea-bordered w-full";
  const labelClass = compact ? "text-xs font-medium" : "text-sm font-medium";
  const formClass = compact
    ? "form-grid grid gap-2.5 sm:grid-cols-2"
    : "form-grid grid gap-4 sm:grid-cols-2";
  const checkboxClass = compact ? "checkbox checkbox-sm" : "checkbox";
  const submitClass = compact ? "btn btn-primary btn-sm" : "btn btn-primary";
  const cancelClass = compact ? "btn btn-ghost btn-sm" : "btn btn-ghost";

  const filteredContracts = contracts.filter((c) => !clientId || c.client_id === clientId);
  const filteredCampaigns = campaigns.filter((c) => !clientId || c.client_id === clientId);
  const unbilledHours = campaignId ? unbilledWorkByCampaign[campaignId] ?? 0 : 0;
  const selectedContract = contracts.find((c) => c.id === contractId);

  const overageHelper = useMemo(() => {
    if (!selectedContract) return null;
    const included = num(selectedContract.included_agency_hours);
    const rate = num(selectedContract.overage_hourly_rate);
    const logged = num(selectedContract.logged_billable_hours);
    if (included <= 0 && rate <= 0) return null;
    const hours = overageHours(included, logged);
    const amount = overageAmount(included, logged, rate);
    return { included, rate, logged, hours, amount };
  }, [selectedContract]);

  function applyContractPrefill(nextContractId: string) {
    setContractId(nextContractId);
    const contract = contracts.find((c) => c.id === nextContractId);
    if (!contract) return;
    const suggested = suggestedInvoiceSubtotal(contract);
    if (suggested > 0) setSubtotal(String(suggested));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const sub = num(fd.get("subtotal"));
    const pass_through_amount = num(fd.get("pass_through_amount"));
    const tax_amount = num(fd.get("tax_amount"));
    const total_amount = num(fd.get("total_amount")) || sub + pass_through_amount + tax_amount;

    if (sub < 0 || pass_through_amount < 0 || tax_amount < 0 || total_amount < 0) {
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
        subtotal: sub,
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
    setContractId("");
    setCampaignId("");
    setSubtotal("");
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={onSubmit} className={formClass}>
      <FormError message={error} />
      <label>
        <span className={labelClass}>Client *</span>
        <select
          name="client_id"
          className={selectClass}
          required
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            setCampaignId("");
            setContractId("");
            setSubtotal("");
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
        <span className={labelClass}>Invoice number *</span>
        <input
          name="invoice_number"
          className={fieldClass}
          required
          defaultValue={`INV-${Date.now().toString().slice(-8)}`}
        />
      </label>
      <label>
        <span className={labelClass}>Contract</span>
        <select
          name="contract_id"
          className={selectClass}
          value={contractId}
          onChange={(e) => applyContractPrefill(e.target.value)}
        >
          <option value="">None</option>
          {filteredContracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={labelClass}>Campaign</span>
        <select
          name="campaign_id"
          className={selectClass}
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
      {selectedContract ? (
        <div className="alert alert-info text-sm sm:col-span-2">
          Prefill from MSA: {selectedContract.billing_method || "billing"}
          {num(selectedContract.monthly_retainer) > 0
            ? ` · retainer ${money(selectedContract.monthly_retainer)}`
            : ""}
          {num(selectedContract.project_fee) > 0
            ? ` · project fee ${money(selectedContract.project_fee)}`
            : ""}
          {overageHelper ? (
            <>
              {" "}
              · included {overageHelper.included}h / logged {overageHelper.logged.toFixed(1)}h
              {overageHelper.hours > 0
                ? ` · overage ${overageHelper.hours.toFixed(1)}h ≈ ${money(overageHelper.amount)}`
                : " · no overage yet"}
            </>
          ) : null}
        </div>
      ) : null}
      <label>
        <span className={labelClass}>Invoice date *</span>
        <input
          name="invoice_date"
          type="date"
          className={fieldClass}
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </label>
      <label>
        <span className={labelClass}>Due date *</span>
        <input name="due_date" type="date" className={fieldClass} required />
      </label>
      <label>
        <span className={labelClass}>Subtotal *</span>
        <input
          name="subtotal"
          type="number"
          min={0}
          step="0.01"
          className={fieldClass}
          required
          value={subtotal}
          onChange={(e) => setSubtotal(e.target.value)}
        />
      </label>
      <label>
        <span className={labelClass}>Pass-through</span>
        <input
          name="pass_through_amount"
          type="number"
          min={0}
          step="0.01"
          className={fieldClass}
          defaultValue={0}
        />
      </label>
      <label>
        <span className={labelClass}>Tax</span>
        <input
          name="tax_amount"
          type="number"
          min={0}
          step="0.01"
          className={fieldClass}
          defaultValue={0}
        />
      </label>
      <label>
        <span className={labelClass}>Total</span>
        <input
          name="total_amount"
          type="number"
          min={0}
          step="0.01"
          className={fieldClass}
          placeholder="Auto-calculated if blank"
        />
      </label>
      <label>
        <span className={labelClass}>Status</span>
        <select name="status" className={selectClass} defaultValue="Draft">
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
            className={checkboxClass}
            checked={markWorkBilled}
            onChange={(e) => setMarkWorkBilled(e.target.checked)}
          />
          <span className={labelClass}>
            Mark {unbilledHours.toFixed(1)}h of approved unbilled work as billed
          </span>
        </label>
      ) : null}
      <label className="sm:col-span-2">
        <span className={labelClass}>Notes</span>
        <textarea name="notes" className={textareaClass} rows={compact ? 2 : 2} />
      </label>
      <div className={`flex flex-wrap gap-2 sm:col-span-2 ${compact ? "justify-end pt-1" : ""}`}>
        {onCancel ? (
          <button type="button" className={cancelClass} onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        ) : null}
        <button type="submit" className={submitClass} disabled={loading}>
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
    const result = await applyPayment(supabase, {
      invoiceId: inv.id,
      clientId: inv.client_id,
      amount,
      paymentDate: String(fd.get("payment_date")),
      paymentMethod: String(fd.get("payment_method")),
      reference: String(fd.get("reference") ?? "").trim(),
      notes: String(fd.get("notes") ?? "").trim(),
      remainingBefore: inv.remaining,
    });

    if (!result.ok) {
      setLoading(false);
      setError(result.error);
      return;
    }

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
