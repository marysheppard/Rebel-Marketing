"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CLIENT_STATUSES,
  ENGAGEMENT_LENGTHS,
  ENGAGEMENT_TYPES,
  INDUSTRIES,
  MARKETING_OBJECTIVES,
  MARKETING_SERVICES,
  US_STATES,
  formatPhoneInput,
  toClientInsertPayload,
  validateClientIntake,
  type ClientIntakeValues,
} from "@/lib/client-intake";

type Option = { id: string; label: string };

const initialValues: ClientIntakeValues = {
  client_name: "",
  dba_brand_name: "",
  industry: "",
  website: "",
  business_phone: "",
  street_address: "",
  address_line_2: "",
  city: "",
  state: "",
  zip_code: "",
  contact_first_name: "",
  contact_last_name: "",
  contact_job_title: "",
  contact_email: "",
  contact_phone: "",
  authorized_approver: false,
  billing_same_as_primary: true,
  billing_first_name: "",
  billing_last_name: "",
  billing_job_title: "",
  billing_email: "",
  billing_phone: "",
  requested_services: [],
  services_other: "",
  primary_objective: "",
  objective_other: "",
  client_notes: "",
  engagement_type: "",
  expected_start_date: "",
  engagement_length: "",
  estimated_monthly_marketing_budget: 0,
  estimated_monthly_advertising_budget: 0,
  status: "Intake in Progress",
  account_manager_id: null,
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-box border border-base-300 bg-base-100 p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 text-lg font-bold text-[#0b1f3a]">{title}</h2>
      <div className="form-grid grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Req({ children }: { children: React.ReactNode }) {
  return <span className="text-error"> {children}</span>;
}

export function ClientIntakeForm({
  accountManagers = [],
}: {
  accountManagers?: Option[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<ClientIntakeValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<{ id: string; client_name: string }[]>(
    [],
  );
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

  const showOtherService = values.requested_services.includes("Other");
  const showOtherObjective = values.primary_objective === "Other";

  const canSubmit = useMemo(() => !loading, [loading]);

  function update<K extends keyof ClientIntakeValues>(key: K, value: ClientIntakeValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setSuccess(null);
  }

  function toggleService(service: string) {
    setValues((prev) => {
      const exists = prev.requested_services.includes(service);
      return {
        ...prev,
        requested_services: exists
          ? prev.requested_services.filter((s) => s !== service)
          : [...prev.requested_services, service],
      };
    });
  }

  async function saveClient(mode: "save" | "build") {
    setError(null);
    setSuccess(null);
    const validationError = validateClientIntake(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const legalName = values.client_name.trim();

    const { data: existing } = await supabase
      .from("clients")
      .select("id, client_name")
      .ilike("client_name", legalName);

    const duplicates = (existing ?? []).filter(
      (c) => c.client_name.trim().toLowerCase() === legalName.toLowerCase(),
    );

    if (duplicates.length > 0 && !confirmDuplicate) {
      setDuplicateMatches(duplicates);
      setDuplicateWarning(
        `“${legalName}” already exists. For renewals or new engagements, open the existing client and build a new contract — do not create a duplicate client.`,
      );
      setLoading(false);
      return;
    }

    const payload = toClientInsertPayload(values);
    const { data, error: insertError } = await supabase
      .from("clients")
      .insert(payload)
      .select("id, customer_id")
      .single();

    setLoading(false);
    if (insertError || !data) {
      setError(insertError?.message || "Could not save client. Please review the form and try again.");
      return;
    }

    setSuccess(
      `Client successfully created. CustomerID ${data.customer_id}. Use Contracts & Documents after linking a client login for in-app signing.`,
    );
    setDuplicateWarning(null);
    setDuplicateMatches([]);
    setConfirmDuplicate(false);
    router.refresh();

    if (mode === "build") {
      router.push(`/app/contracts/builder?clientId=${data.id}`);
      return;
    }

    router.push(`/app/clients/${data.id}`);
  }

  return (
    <div className="space-y-5">
      {error ? <div className="alert alert-error text-sm">{error}</div> : null}
      {success ? <div className="alert alert-success text-sm">{success}</div> : null}
      {duplicateWarning ? (
        <div className="alert alert-warning text-sm">
          <div className="w-full space-y-3">
            <p>{duplicateWarning}</p>
            {duplicateMatches.length ? (
              <ul className="space-y-1">
                {duplicateMatches.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.client_name}</span>
                    <Link href={`/app/clients/${c.id}`} className="link link-hover text-xs">
                      Open profile
                    </Link>
                    <Link
                      href={`/app/contracts/builder?clientId=${c.id}`}
                      className="btn btn-primary btn-xs"
                    >
                      New contract
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={confirmDuplicate}
                onChange={(e) => setConfirmDuplicate(e.target.checked)}
              />
              <span>Create a separate client record anyway (rare — same legal name, different entity)</span>
            </label>
          </div>
        </div>
      ) : null}

      <Section title="1 — Client Information">
        <label className="sm:col-span-2">
          <span>Legal Business Name<Req>*</Req></span>
          <input
            className="input input-bordered w-full"
            value={values.client_name}
            onChange={(e) => {
              setConfirmDuplicate(false);
              setDuplicateWarning(null);
              setDuplicateMatches([]);
              update("client_name", e.target.value);
            }}
            required
          />
          <span className="text-xs opacity-60">Used as the official name on the Marketing Services Agreement.</span>
        </label>
        <label>
          <span>DBA / Brand Name</span>
          <input
            className="input input-bordered w-full"
            value={values.dba_brand_name}
            onChange={(e) => update("dba_brand_name", e.target.value)}
          />
        </label>
        <label>
          <span>Industry</span>
          <select
            className="select select-bordered w-full"
            value={values.industry}
            onChange={(e) => update("industry", e.target.value)}
          >
            <option value="">Select industry</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Company Website</span>
          <input
            className="input input-bordered w-full"
            type="url"
            placeholder="https://"
            value={values.website}
            onChange={(e) => update("website", e.target.value)}
          />
        </label>
        <label>
          <span>Business Phone</span>
          <input
            className="input input-bordered w-full"
            value={values.business_phone}
            onChange={(e) => update("business_phone", formatPhoneInput(e.target.value))}
          />
        </label>
        <label className="sm:col-span-2">
          <span>Street Address<Req>*</Req></span>
          <input
            className="input input-bordered w-full"
            value={values.street_address}
            onChange={(e) => update("street_address", e.target.value)}
            required
          />
        </label>
        <label className="sm:col-span-2">
          <span>Address Line 2</span>
          <input
            className="input input-bordered w-full"
            value={values.address_line_2}
            onChange={(e) => update("address_line_2", e.target.value)}
          />
        </label>
        <label>
          <span>City<Req>*</Req></span>
          <input
            className="input input-bordered w-full"
            value={values.city}
            onChange={(e) => update("city", e.target.value)}
            required
          />
        </label>
        <label>
          <span>State<Req>*</Req></span>
          <select
            className="select select-bordered w-full"
            value={values.state}
            onChange={(e) => update("state", e.target.value)}
            required
          >
            <option value="">Select state</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          <span>ZIP Code<Req>*</Req></span>
          <input
            className="input input-bordered w-full"
            value={values.zip_code}
            onChange={(e) => update("zip_code", e.target.value)}
            required
          />
        </label>
        {accountManagers.length ? (
          <label>
            <span>Account Manager</span>
            <select
              className="select select-bordered w-full"
              value={values.account_manager_id ?? ""}
              onChange={(e) => update("account_manager_id", e.target.value || null)}
            >
              <option value="">Unassigned</option>
              {accountManagers.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </label>
        ) : null}
      </Section>

      <Section title="2 — Primary Contact">
        <label>
          <span>First Name<Req>*</Req></span>
          <input
            className="input input-bordered w-full"
            value={values.contact_first_name}
            onChange={(e) => update("contact_first_name", e.target.value)}
            required
          />
        </label>
        <label>
          <span>Last Name<Req>*</Req></span>
          <input
            className="input input-bordered w-full"
            value={values.contact_last_name}
            onChange={(e) => update("contact_last_name", e.target.value)}
            required
          />
        </label>
        <label>
          <span>Job Title</span>
          <input
            className="input input-bordered w-full"
            value={values.contact_job_title}
            onChange={(e) => update("contact_job_title", e.target.value)}
          />
        </label>
        <label>
          <span>Email Address<Req>*</Req></span>
          <input
            className="input input-bordered w-full"
            type="email"
            value={values.contact_email}
            onChange={(e) => update("contact_email", e.target.value)}
            required
          />
        </label>
        <label>
          <span>Phone Number<Req>*</Req></span>
          <input
            className="input input-bordered w-full"
            value={values.contact_phone}
            onChange={(e) => update("contact_phone", formatPhoneInput(e.target.value))}
            required
          />
        </label>
        <label className="flex-row items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            className="checkbox"
            checked={values.authorized_approver}
            onChange={(e) => update("authorized_approver", e.target.checked)}
          />
          <span className="text-sm font-medium">
            This person is authorized to approve marketing work and deliverables.
          </span>
        </label>
      </Section>

      <Section title="3 — Billing Contact">
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-medium">
            Is the billing contact the same as the primary contact?<Req>*</Req>
          </legend>
          <div className="flex gap-4">
            <label className="flex-row items-center gap-2">
              <input
                type="radio"
                className="radio"
                checked={values.billing_same_as_primary}
                onChange={() => update("billing_same_as_primary", true)}
              />
              <span>Yes</span>
            </label>
            <label className="flex-row items-center gap-2">
              <input
                type="radio"
                className="radio"
                checked={!values.billing_same_as_primary}
                onChange={() => update("billing_same_as_primary", false)}
              />
              <span>No</span>
            </label>
          </div>
        </fieldset>
        {!values.billing_same_as_primary ? (
          <>
            <label>
              <span>Billing Contact First Name<Req>*</Req></span>
              <input
                className="input input-bordered w-full"
                value={values.billing_first_name}
                onChange={(e) => update("billing_first_name", e.target.value)}
              />
            </label>
            <label>
              <span>Billing Contact Last Name<Req>*</Req></span>
              <input
                className="input input-bordered w-full"
                value={values.billing_last_name}
                onChange={(e) => update("billing_last_name", e.target.value)}
              />
            </label>
            <label>
              <span>Billing Contact Job Title</span>
              <input
                className="input input-bordered w-full"
                value={values.billing_job_title}
                onChange={(e) => update("billing_job_title", e.target.value)}
              />
            </label>
            <label>
              <span>Billing Email<Req>*</Req></span>
              <input
                className="input input-bordered w-full"
                type="email"
                value={values.billing_email}
                onChange={(e) => update("billing_email", e.target.value)}
              />
            </label>
            <label>
              <span>Billing Phone<Req>*</Req></span>
              <input
                className="input input-bordered w-full"
                value={values.billing_phone}
                onChange={(e) => update("billing_phone", formatPhoneInput(e.target.value))}
              />
            </label>
          </>
        ) : null}
      </Section>

      <Section title="4 — Client Marketing Needs">
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-medium">Requested services<Req>*</Req></p>
          <div className="grid gap-2 sm:grid-cols-2">
            {MARKETING_SERVICES.map((service) => (
              <label key={service} className="flex-row items-center gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={values.requested_services.includes(service)}
                  onChange={() => toggleService(service)}
                />
                <span className="text-sm">{service}</span>
              </label>
            ))}
          </div>
        </div>
        {showOtherService ? (
          <label className="sm:col-span-2">
            <span>Describe Other service<Req>*</Req></span>
            <input
              className="input input-bordered w-full"
              value={values.services_other}
              onChange={(e) => update("services_other", e.target.value)}
            />
          </label>
        ) : null}
        <label>
          <span>Primary Marketing Objective<Req>*</Req></span>
          <select
            className="select select-bordered w-full"
            value={values.primary_objective}
            onChange={(e) => update("primary_objective", e.target.value)}
          >
            <option value="">Select objective</option>
            {MARKETING_OBJECTIVES.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
        {showOtherObjective ? (
          <label>
            <span>Describe Other objective<Req>*</Req></span>
            <input
              className="input input-bordered w-full"
              value={values.objective_other}
              onChange={(e) => update("objective_other", e.target.value)}
            />
          </label>
        ) : (
          <div />
        )}
        <label className="sm:col-span-2">
          <span>Client Notes / Special Requirements</span>
          <textarea
            className="textarea textarea-bordered w-full"
            rows={3}
            value={values.client_notes}
            onChange={(e) => update("client_notes", e.target.value)}
          />
        </label>
      </Section>

      <Section title="5 — Engagement Preferences (estimates only)">
        <p className="sm:col-span-2 -mt-2 mb-1 text-xs opacity-60">
          Preferences and budget estimates for planning — not binding contract fees, hours, or payment terms.
        </p>
        <label>
          <span>Preferred Engagement Type</span>
          <select
            className="select select-bordered w-full"
            value={values.engagement_type}
            onChange={(e) => update("engagement_type", e.target.value)}
          >
            <option value="">Select type</option>
            {ENGAGEMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Expected Start Date</span>
          <input
            type="date"
            className="input input-bordered w-full"
            value={values.expected_start_date}
            onChange={(e) => update("expected_start_date", e.target.value)}
          />
        </label>
        <label>
          <span>Expected Engagement Length</span>
          <select
            className="select select-bordered w-full"
            value={values.engagement_length}
            onChange={(e) => update("engagement_length", e.target.value)}
          >
            <option value="">Select length</option>
            {ENGAGEMENT_LENGTHS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Estimated Monthly Marketing Budget</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="input input-bordered w-full"
            value={values.estimated_monthly_marketing_budget}
            onChange={(e) => update("estimated_monthly_marketing_budget", Number(e.target.value) || 0)}
          />
        </label>
        <label className="sm:col-span-2">
          <span>Estimated Monthly Advertising Budget</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="input input-bordered w-full"
            value={values.estimated_monthly_advertising_budget}
            onChange={(e) => update("estimated_monthly_advertising_budget", Number(e.target.value) || 0)}
          />
          <span className="text-xs opacity-70">
            Advertising budget represents expected third-party media spend and is separate from agency service fees.
          </span>
        </label>
      </Section>

      <Section title="6 — Intake Status">
        <label>
          <span>Client Status<Req>*</Req></span>
          <select
            className="select select-bordered w-full"
            value={values.status}
            onChange={(e) => update("status", e.target.value)}
          >
            {CLIENT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </Section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn btn-outline"
          disabled={!canSubmit}
          onClick={() => saveClient("save")}
        >
          {loading ? "Saving…" : "Save Client"}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canSubmit}
          onClick={() => saveClient("build")}
        >
          {loading ? "Saving…" : "Save & Build Contract"}
        </button>
      </div>
    </div>
  );
}
