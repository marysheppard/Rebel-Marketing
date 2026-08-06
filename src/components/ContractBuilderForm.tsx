"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/format";
import type { Client } from "@/lib/types";
import {
  AD_SPEND_TREATMENTS,
  BILLING_FREQUENCIES,
  BILLING_MODELS,
  MARKETING_SERVICES,
  PAYMENT_TERMS_OPTIONS,
  defaultContractValues,
  showsAdBudget,
  showsHourly,
  showsProjectFee,
  showsRetainer,
  toContractInsertPayload,
  validateContractBuilder,
  type ContractBuilderValues,
} from "@/lib/contract-builder";
import { generateMarketingServicesAgreement } from "@/lib/generate-msa";

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

export function ContractBuilderForm({ client }: { client: Client }) {
  const router = useRouter();
  const [values, setValues] = useState<ContractBuilderValues>(() => {
    const base = defaultContractValues(client.id);
    return {
      ...base,
      contract_name: `${client.client_name} Marketing Services`,
      service_types: client.requested_services?.length
        ? [...client.requested_services]
        : [],
      campaign_budget: Number(client.estimated_monthly_advertising_budget) || 0,
      monthly_retainer: Number(client.estimated_monthly_marketing_budget) || 0,
      start_date: client.expected_start_date || base.start_date,
      billing_method:
        client.engagement_type === "Fixed-Fee Project"
          ? "Project Fee"
          : client.engagement_type === "Hourly / Time and Materials"
            ? "Hourly / Time and Materials"
            : client.engagement_type === "Hybrid"
              ? "Hybrid"
              : "Monthly Retainer",
    };
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agreementHtml, setAgreementHtml] = useState<string | null>(null);
  const [savedContractId, setSavedContractId] = useState<string | null>(null);
  const [engagementNote, setEngagementNote] = useState<string | null>(null);

  const emphasizeAds = useMemo(
    () => showsAdBudget(values.service_types),
    [values.service_types],
  );

  function update<K extends keyof ContractBuilderValues>(
    key: K,
    value: ContractBuilderValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function toggleService(service: string) {
    setValues((prev) => {
      const exists = prev.service_types.includes(service);
      return {
        ...prev,
        service_types: exists
          ? prev.service_types.filter((s) => s !== service)
          : [...prev.service_types, service],
      };
    });
  }

  async function generateContract() {
    setError(null);
    const validationError = validateContractBuilder(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const payload = toContractInsertPayload(values);
    const draftForHtml = {
      ...payload,
      agreement_html: "",
      agreement_generated_at: null,
    };
    const html = generateMarketingServicesAgreement({
      client,
      contract: draftForHtml,
    });

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("contracts")
      .insert({
        ...payload,
        agreement_html: html,
        agreement_generated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    setLoading(false);
    if (insertError || !data) {
      setError(insertError?.message || "Could not save contract terms.");
      return;
    }

    // Update client lifecycle on the SAME client row — never insert a duplicate client
    // New MSAs stay Draft; engagement activates only after Fully Executed countersign.
    await supabase
      .from("clients")
      .update({ status: "Ready for Contract" })
      .eq("id", client.id)
      .in("status", ["Prospect", "Intake in Progress", "Ready for Contract"]);

    setEngagementNote(
      "Saved as Draft. Open the contract record to Finalize for Signature, then Send to Client Portal for a linked client user.",
    );
    setSavedContractId(data.id);
    setAgreementHtml(html);
    router.refresh();
  }

  const contactName =
    `${client.contact_first_name || ""} ${client.contact_last_name || ""}`.trim() ||
    client.contact_name;

  return (
    <div className="space-y-5">
      {error ? <div className="alert alert-error text-sm">{error}</div> : null}
      {savedContractId ? (
        <div className="alert alert-success text-sm">
          <div>
            <p>
              Contract generated and saved against this client.{" "}
              <Link className="link font-semibold" href={`/app/contracts/${savedContractId}`}>
                Open contract record
              </Link>
            </p>
            {engagementNote ? <p className="mt-1 opacity-80">{engagementNote}</p> : null}
          </div>
        </div>
      ) : null}

      <section className="rounded-box border border-[#0b1f3a22] bg-[#f7f9fc] p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0b1f3a]">Client summary (from intake)</h2>
            <p className="text-sm opacity-70">Pulled automatically — no re-entry required.</p>
          </div>
          <Link href={`/app/clients/${client.id}`} className="btn btn-ghost btn-sm">
            View client profile
          </Link>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="opacity-60">Legal Business Name</dt>
            <dd className="font-medium">{client.client_name}</dd>
          </div>
          <div>
            <dt className="opacity-60">DBA / Brand</dt>
            <dd>{client.dba_brand_name || "—"}</dd>
          </div>
          <div>
            <dt className="opacity-60">Business address</dt>
            <dd>
              {[client.street_address, client.address_line_2, [client.city, client.state, client.zip_code].filter(Boolean).join(", ")]
                .filter(Boolean)
                .join(", ") || "—"}
            </dd>
          </div>
          <div>
            <dt className="opacity-60">Primary contact</dt>
            <dd>
              {contactName}
              {client.contact_job_title ? ` · ${client.contact_job_title}` : ""}
              <div className="opacity-70">{client.contact_email}</div>
            </dd>
          </div>
          <div>
            <dt className="opacity-60">Requested services</dt>
            <dd>{(client.requested_services ?? []).join(", ") || "—"}</dd>
          </div>
          <div>
            <dt className="opacity-60">Primary objective</dt>
            <dd>
              {client.primary_objective === "Other"
                ? client.objective_other
                : client.primary_objective || "—"}
            </dd>
          </div>
          <div>
            <dt className="opacity-60">Expected start / engagement</dt>
            <dd>
              {client.expected_start_date || "—"}
              {client.engagement_type ? ` · ${client.engagement_type}` : ""}
            </dd>
          </div>
          <div>
            <dt className="opacity-60">Estimated budgets</dt>
            <dd>
              Marketing {money(client.estimated_monthly_marketing_budget)} · Ads{" "}
              {money(client.estimated_monthly_advertising_budget)}
            </dd>
          </div>
        </dl>
      </section>

      <Section title="Contract identity">
        <label>
          <span>Contract name *</span>
          <input
            className="input input-bordered w-full"
            value={values.contract_name}
            onChange={(e) => update("contract_name", e.target.value)}
          />
        </label>
        <label>
          <span>Contract number *</span>
          <input
            className="input input-bordered w-full"
            value={values.contract_number}
            onChange={(e) => update("contract_number", e.target.value)}
          />
        </label>
        <label>
          <span>Start date *</span>
          <input
            type="date"
            className="input input-bordered w-full"
            value={values.start_date}
            onChange={(e) => update("start_date", e.target.value)}
          />
        </label>
        <label>
          <span>End date *</span>
          <input
            type="date"
            className="input input-bordered w-full"
            value={values.end_date}
            onChange={(e) => update("end_date", e.target.value)}
          />
        </label>
      </Section>

      <Section title="Services & deliverables">
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-medium">Service types *</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {MARKETING_SERVICES.map((service) => (
              <label key={service} className="flex-row items-center gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={values.service_types.includes(service)}
                  onChange={() => toggleService(service)}
                />
                <span className="text-sm">{service}</span>
              </label>
            ))}
          </div>
        </div>
        <label className="sm:col-span-2">
          <span>Deliverables *</span>
          <textarea
            className="textarea textarea-bordered w-full"
            rows={3}
            placeholder="List deliverables and acceptance criteria…"
            value={values.deliverables}
            onChange={(e) => update("deliverables", e.target.value)}
          />
        </label>
        <label className="sm:col-span-2">
          <span>Additional scope notes</span>
          <textarea
            className="textarea textarea-bordered w-full"
            rows={2}
            value={values.scope}
            onChange={(e) => update("scope", e.target.value)}
          />
        </label>
      </Section>

      <Section title="Billing model & fees">
        <label>
          <span>Billing model *</span>
          <select
            className="select select-bordered w-full"
            value={values.billing_method}
            onChange={(e) => update("billing_method", e.target.value)}
          >
            {BILLING_MODELS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Billing frequency</span>
          <select
            className="select select-bordered w-full"
            value={values.billing_frequency}
            onChange={(e) => update("billing_frequency", e.target.value)}
          >
            {BILLING_FREQUENCIES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Payment terms *</span>
          <select
            className="select select-bordered w-full"
            value={values.payment_terms}
            onChange={(e) => update("payment_terms", e.target.value)}
          >
            {PAYMENT_TERMS_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        {showsRetainer(values.billing_method) ? (
          <label>
            <span>Monthly retainer</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input input-bordered w-full"
              value={values.monthly_retainer}
              onChange={(e) => update("monthly_retainer", Number(e.target.value) || 0)}
            />
          </label>
        ) : null}
        {showsProjectFee(values.billing_method) ? (
          <label>
            <span>Project fee</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input input-bordered w-full"
              value={values.project_fee}
              onChange={(e) => update("project_fee", Number(e.target.value) || 0)}
            />
          </label>
        ) : null}
        {showsHourly(values.billing_method) ? (
          <>
            <label>
              <span>Included agency hours</span>
              <input
                type="number"
                min={0}
                step="0.5"
                className="input input-bordered w-full"
                value={values.included_agency_hours}
                onChange={(e) => update("included_agency_hours", Number(e.target.value) || 0)}
              />
            </label>
            <label>
              <span>Overage / additional hourly rate</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="input input-bordered w-full"
                value={values.overage_hourly_rate}
                onChange={(e) => update("overage_hourly_rate", Number(e.target.value) || 0)}
              />
            </label>
          </>
        ) : null}
      </Section>

      <Section title="Advertising & pass-through costs">
        <label className={emphasizeAds ? "sm:col-span-2" : undefined}>
          <span>Monthly advertising budget{emphasizeAds ? " *" : ""}</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="input input-bordered w-full"
            value={values.campaign_budget}
            onChange={(e) => update("campaign_budget", Number(e.target.value) || 0)}
          />
          {emphasizeAds ? (
            <span className="text-xs text-[#1e3a5f]">
              Emphasized because paid media services were selected.
            </span>
          ) : null}
        </label>
        <label>
          <span>Advertising spend treatment</span>
          <select
            className="select select-bordered w-full"
            value={values.advertising_spend_treatment}
            onChange={(e) => update("advertising_spend_treatment", e.target.value)}
          >
            {AD_SPEND_TREATMENTS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex-row items-center gap-2">
          <input
            type="checkbox"
            className="checkbox"
            checked={values.reimbursable_vendor_costs}
            onChange={(e) => update("reimbursable_vendor_costs", e.target.checked)}
          />
          <span className="text-sm font-medium">Reimbursable vendor costs allowed</span>
        </label>
        <label>
          <span>Pass-through markup %</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="input input-bordered w-full"
            value={values.pass_through_markup_pct}
            onChange={(e) => update("pass_through_markup_pct", Number(e.target.value) || 0)}
            disabled={!values.reimbursable_vendor_costs && !values.advertising_spend_treatment.includes("markup")}
          />
        </label>
      </Section>

      <Section title="Approvals, renewal & deposit">
        <label className="flex-row items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            className="checkbox"
            checked={values.approval_required}
            onChange={(e) => update("approval_required", e.target.checked)}
          />
          <span className="text-sm font-medium">Client approval required for deliverables</span>
        </label>
        {values.approval_required ? (
          <label>
            <span>Spending approval threshold</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input input-bordered w-full"
              value={values.spending_approval_threshold}
              onChange={(e) => update("spending_approval_threshold", Number(e.target.value) || 0)}
            />
          </label>
        ) : null}
        <label className="flex-row items-center gap-2">
          <input
            type="checkbox"
            className="checkbox"
            checked={values.renewal_option}
            onChange={(e) => update("renewal_option", e.target.checked)}
          />
          <span className="text-sm font-medium">Renewal option</span>
        </label>
        <label>
          <span>Renewal terms</span>
          <input
            className="input input-bordered w-full"
            value={values.renewal_terms}
            onChange={(e) => update("renewal_terms", e.target.value)}
          />
        </label>
        <label>
          <span>Cancellation notice (days)</span>
          <input
            type="number"
            min={0}
            className="input input-bordered w-full"
            value={values.cancellation_notice_days}
            onChange={(e) => update("cancellation_notice_days", Number(e.target.value) || 0)}
          />
        </label>
        <label className="sm:col-span-2">
          <span>Cancellation terms</span>
          <textarea
            className="textarea textarea-bordered w-full"
            rows={2}
            value={values.cancellation_terms}
            onChange={(e) => update("cancellation_terms", e.target.value)}
          />
        </label>
        <label className="flex-row items-center gap-2">
          <input
            type="checkbox"
            className="checkbox"
            checked={values.deposit_applicable}
            onChange={(e) => update("deposit_applicable", e.target.checked)}
          />
          <span className="text-sm font-medium">Deposit applicable</span>
        </label>
        {values.deposit_applicable ? (
          <label>
            <span>Deposit amount</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input input-bordered w-full"
              value={values.deposit_amount}
              onChange={(e) => update("deposit_amount", Number(e.target.value) || 0)}
            />
          </label>
        ) : null}
        <label className="sm:col-span-2">
          <span>Internal notes</span>
          <textarea
            className="textarea textarea-bordered w-full"
            rows={2}
            value={values.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </label>
      </Section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading}
          onClick={generateContract}
        >
          {loading ? "Generating…" : "Generate Contract"}
        </button>
        <Link href="/app/contracts" className="btn btn-ghost">
          Cancel
        </Link>
      </div>

      {agreementHtml ? (
        <section className="rounded-box border border-base-300 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[#0b1f3a]">Marketing Services Agreement</h2>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                const w = window.open("", "_blank");
                if (!w) return;
                w.document.write(agreementHtml);
                w.document.close();
                w.focus();
                w.print();
              }}
            >
              Print / PDF
            </button>
          </div>
          <iframe
            title="Marketing Services Agreement preview"
            className="h-[70vh] w-full rounded-lg border border-base-300 bg-white"
            srcDoc={agreementHtml}
          />
        </section>
      ) : null}
    </div>
  );
}
