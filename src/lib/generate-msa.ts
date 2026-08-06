import { money } from "@/lib/format";
import { formatAddress, formatEmail, formatPhone } from "@/lib/contact-format";
import type { Client, Contract } from "@/lib/types";

type AgreementInput = {
  client: Client;
  contract: Omit<
    Contract,
    "id" | "created_at" | "updated_at" | "agreement_html" | "agreement_generated_at" | "clients"
  > & { id?: string };
};

function esc(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function addressBlock(client: Client) {
  const formatted = formatAddress(
    {
      street_address: client.street_address,
      address_line_2: client.address_line_2,
      city: client.city,
      state: client.state,
      zip_code: client.zip_code,
    },
    "multiline",
  );
  if (formatted === "—") return "—";
  return formatted.split("\n").map(esc).join("<br/>");
}

export function generateMarketingServicesAgreement(input: AgreementInput) {
  const { client, contract } = input;
  const legalName = client.client_name;
  const dba = client.dba_brand_name?.trim();
  const contactName =
    `${client.contact_first_name || ""} ${client.contact_last_name || ""}`.trim() ||
    client.contact_name;
  const services = (contract.service_types?.length
    ? contract.service_types
    : client.requested_services) ?? [];
  const objective =
    client.primary_objective === "Other"
      ? client.objective_other
      : client.primary_objective;
  const generatedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Marketing Services Agreement — ${esc(legalName)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #0b1f3a; line-height: 1.55; max-width: 800px; margin: 40px auto; padding: 0 24px; }
    h1 { font-size: 28px; letter-spacing: 0.02em; margin-bottom: 4px; }
    h2 { font-size: 16px; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 28px; border-bottom: 1px solid #0b1f3a33; padding-bottom: 6px; }
    .eyebrow { color: #1e3a5f; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; font-family: Helvetica, Arial, sans-serif; }
    .meta { font-family: Helvetica, Arial, sans-serif; font-size: 13px; color: #1e3a5f; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-family: Helvetica, Arial, sans-serif; font-size: 13px; }
    td { padding: 6px 0; vertical-align: top; }
    td:first-child { width: 42%; color: #1e3a5f; }
    ul { margin: 8px 0 0 18px; }
    .footer { margin-top: 36px; font-size: 12px; color: #1e3a5f; font-family: Helvetica, Arial, sans-serif; }
    .sig { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; font-family: Helvetica, Arial, sans-serif; font-size: 13px; }
    .sig .line { border-top: 1px solid #0b1f3a; margin-top: 48px; padding-top: 8px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <p class="eyebrow">Rebel Marketing</p>
  <h1>Marketing Services Agreement</h1>
  <p class="meta">Agreement No. ${esc(contract.contract_number)} · Generated ${esc(generatedOn)}</p>

  <h2>1. Parties</h2>
  <p>This Marketing Services Agreement (the “Agreement”) is entered into between <strong>Rebel Marketing</strong> (“Agency”) and <strong>${esc(legalName)}</strong>${dba ? ` (DBA / Brand: <strong>${esc(dba)}</strong>)` : ""} (“Client”).</p>
  <table>
    <tr><td>Client legal name</td><td>${esc(legalName)}</td></tr>
    <tr><td>Business address</td><td>${addressBlock(client) || "—"}</td></tr>
    <tr><td>Primary contact</td><td>${esc(contactName)}${client.contact_job_title ? `, ${esc(client.contact_job_title)}` : ""}</td></tr>
    <tr><td>Primary contact email</td><td>${esc(formatEmail(client.contact_email))}</td></tr>
    <tr><td>Primary contact phone</td><td>${esc(formatPhone(client.contact_phone))}</td></tr>
    <tr><td>Authorized to approve deliverables</td><td>${client.authorized_approver ? "Yes" : "Not designated"}</td></tr>
  </table>

  <h2>2. Term</h2>
  <table>
    <tr><td>Contract name</td><td>${esc(contract.contract_name)}</td></tr>
    <tr><td>Start date</td><td>${esc(contract.start_date)}</td></tr>
    <tr><td>End date</td><td>${esc(contract.end_date)}</td></tr>
    <tr><td>Status</td><td>${esc(contract.contract_status)}</td></tr>
  </table>

  <h2>3. Services &amp; Objectives</h2>
  <p><strong>Service types:</strong></p>
  <ul>${services.length ? services.map((s) => `<li>${esc(s)}</li>`).join("") : "<li>As described in scope</li>"}</ul>
  <p><strong>Primary marketing objective:</strong> ${esc(objective || "As mutually agreed")}</p>
  <p><strong>Deliverables / scope:</strong></p>
  <p>${esc(contract.deliverables || contract.scope || "To be finalized in writing by the parties.")}</p>

  <h2>4. Commercial Terms</h2>
  <table>
    <tr><td>Billing model</td><td>${esc(contract.billing_method)}</td></tr>
    <tr><td>Billing frequency</td><td>${esc(contract.billing_frequency || "—")}</td></tr>
    <tr><td>Monthly retainer</td><td>${esc(money(contract.monthly_retainer))}</td></tr>
    <tr><td>Project fee</td><td>${esc(money(contract.project_fee))}</td></tr>
    <tr><td>Included agency hours</td><td>${esc(contract.included_agency_hours)} hours / period</td></tr>
    <tr><td>Overage / additional hourly rate</td><td>${esc(money(contract.overage_hourly_rate))}</td></tr>
    <tr><td>Payment terms</td><td>${esc(contract.payment_terms)}</td></tr>
    <tr><td>Deposit</td><td>${contract.deposit_amount > 0 ? esc(money(contract.deposit_amount)) : "None"}</td></tr>
  </table>

  <h2>5. Advertising &amp; Pass-Through Costs</h2>
  <table>
    <tr><td>Monthly advertising budget</td><td>${esc(money(contract.campaign_budget))}</td></tr>
    <tr><td>Advertising spend treatment</td><td>${esc(contract.advertising_spend_treatment || "—")}</td></tr>
    <tr><td>Reimbursable vendor costs</td><td>${contract.reimbursable_vendor_costs ? "Allowed" : "Not allowed without written approval"}</td></tr>
    <tr><td>Pass-through markup</td><td>${esc(contract.pass_through_markup_pct)}%</td></tr>
  </table>
  <p>Advertising budget represents expected third-party media spend and is separate from Agency service fees unless expressly stated otherwise.</p>

  <h2>6. Approvals</h2>
  <table>
    <tr><td>Client approval required for deliverables</td><td>${contract.approval_required ? "Yes" : "No"}</td></tr>
    <tr><td>Spending approval threshold</td><td>${contract.approval_required ? esc(money(contract.spending_approval_threshold)) : "N/A"}</td></tr>
  </table>

  <h2>7. Renewal &amp; Cancellation</h2>
  <table>
    <tr><td>Renewal option</td><td>${contract.renewal_option ? "Yes" : "No"}</td></tr>
    <tr><td>Renewal terms</td><td>${esc(contract.renewal_terms || "—")}</td></tr>
    <tr><td>Cancellation notice</td><td>${esc(contract.cancellation_notice_days)} days</td></tr>
    <tr><td>Cancellation terms</td><td>${esc(contract.cancellation_terms || "—")}</td></tr>
  </table>

  <h2>8. General</h2>
  <p>This Agreement, together with any statements of work or schedules executed by the parties, constitutes the entire understanding regarding the services described herein. Capitalized commercial amounts and structured terms stored in Agency systems shall control operational billing, budget monitoring, approvals, and pass-through expense handling.</p>
  ${contract.notes ? `<p><strong>Notes:</strong> ${esc(contract.notes)}</p>` : ""}

  <div class="sig">
    <div>
      <div class="line">Authorized signature — Rebel Marketing</div>
      <div>Name / Title</div>
      <div>Date</div>
    </div>
    <div>
      <div class="line">Authorized signature — ${esc(legalName)}</div>
      <div>Name / Title</div>
      <div>Date</div>
    </div>
  </div>

  <p class="footer">Generated by Rebel Marketing Contract Builder. Print or export to PDF from your browser as needed.</p>
</body>
</html>`;
}
