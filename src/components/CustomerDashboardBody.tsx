"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { payAccountBalance, payInvoiceBalance } from "@/app/actions/pay-invoice-balance";
import {
  CustomizeLayoutButton,
  DashboardCustomizePanel,
} from "@/components/dashboards/DashboardCustomizePanel";
import { UpdateApprovalStatusForm } from "@/components/forms";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { money } from "@/lib/format";
import {
  CUSTOMER_DASHBOARD_SECTIONS,
  CUSTOMER_DASHBOARD_STORAGE,
  type CustomerDashboardSectionId,
} from "@/lib/customer-dashboard-layout";
import { useDashboardLayout } from "@/lib/use-dashboard-layout";

export type CustomerCampaignRow = {
  id: string;
  campaign_name: string;
  campaign_type: string;
  campaign_status: string;
  start_date: string;
  end_date: string;
  spent: number;
  budget: number;
  timePct: number;
  pctUsed: number;
};

export type CustomerInvoiceRow = {
  id: string;
  invoice_number: string;
  due_date: string;
  status: string;
  total: number;
  paid: number;
  remaining: number;
  overdue: boolean;
  dueSoon: boolean;
  disputed: boolean;
};

type InvoiceSearchCriteria = {
  invoice_number: string;
  due_date: string;
  status: string;
  total: string;
  paid: string;
  remaining: string;
};

const EMPTY_INVOICE_SEARCH: InvoiceSearchCriteria = {
  invoice_number: "",
  due_date: "",
  status: "",
  total: "",
  paid: "",
  remaining: "",
};

const INVOICE_SEARCH_FIELDS: {
  key: keyof InvoiceSearchCriteria;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "invoice_number",
    label: "Invoice number",
    placeholder: "e.g. INV-1002",
  },
  { key: "due_date", label: "Due date", placeholder: "e.g. 2026-08-01" },
  { key: "status", label: "Status", placeholder: "e.g. Partially Paid" },
  { key: "total", label: "Total", placeholder: "e.g. 14500" },
  { key: "paid", label: "Paid", placeholder: "e.g. 5000" },
  { key: "remaining", label: "Remaining", placeholder: "e.g. 14500" },
];

function normalizeMoneyQuery(q: string) {
  return q.replace(/[$,\s]/g, "").toLowerCase();
}

function moneyFieldMatches(value: number, query: string) {
  const q = normalizeMoneyQuery(query);
  if (!q) return true;
  const raw = String(value);
  const fixed = value.toFixed(2);
  const display = money(value);
  return (
    raw.toLowerCase().includes(q) ||
    fixed.toLowerCase().includes(q) ||
    normalizeMoneyQuery(display).includes(q)
  );
}

function textFieldMatches(value: string, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return value.toLowerCase().includes(q);
}

function statusFieldMatches(row: CustomerInvoiceRow, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    row.status,
    row.disputed ? "disputed" : "",
    row.overdue ? "overdue" : "",
    row.dueSoon ? "due soon" : "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

/** All non-empty criteria must match (AND). */
function invoiceMatchesCriteria(
  row: CustomerInvoiceRow,
  criteria: InvoiceSearchCriteria,
) {
  return (
    textFieldMatches(row.invoice_number, criteria.invoice_number) &&
    textFieldMatches(row.due_date, criteria.due_date) &&
    statusFieldMatches(row, criteria.status) &&
    moneyFieldMatches(row.total, criteria.total) &&
    moneyFieldMatches(row.paid, criteria.paid) &&
    moneyFieldMatches(row.remaining, criteria.remaining)
  );
}

function hasActiveInvoiceSearch(criteria: InvoiceSearchCriteria) {
  return INVOICE_SEARCH_FIELDS.some((f) => criteria[f.key].trim().length > 0);
}

export type CustomerApprovalRow = {
  id: string;
  approval_type: string;
  description: string;
  requested_date: string;
  approval_status: string;
  campaign_name: string;
};

type CustomerDashboardBodyProps = {
  userId: string;
  fullName: string;
  activeCampaignCount: number;
  totalInvoiced: number;
  balance: number;
  pendingCount: number;
  pendingChangeRequestCount: number;
  awaitingSignature: number;
  campaigns: CustomerCampaignRow[];
  openInvoices: CustomerInvoiceRow[];
  nextDueLabel: string | null;
  overdueTotal: number;
  invoiceCount: number;
  pendingApprovals: CustomerApprovalRow[];
};

export function CustomerDashboardBody(props: CustomerDashboardBodyProps) {
  const layout = useDashboardLayout({
    userId: props.userId,
    storagePrefix: CUSTOMER_DASHBOARD_STORAGE,
    sections: CUSTOMER_DASHBOARD_SECTIONS,
  });

  /** Pair adjacent balance+approvals into the original 2-column row. */
  const blocks = (() => {
    const out: (
      | {
          type: "pair";
          left: "balance" | "approvals";
          right: "balance" | "approvals";
        }
      | { type: "single"; id: CustomerDashboardSectionId }
    )[] = [];
    let i = 0;
    const visible = layout.visible;
    while (i < visible.length) {
      const a = visible[i]!;
      const b = visible[i + 1];
      if (
        (a === "balance" && b === "approvals") ||
        (a === "approvals" && b === "balance")
      ) {
        out.push({ type: "pair", left: a, right: b });
        i += 2;
      } else {
        out.push({ type: "single", id: a });
        i += 1;
      }
    }
    return out;
  })();

  return (
    <div>
      <PageHeader
        title="Customer Dashboard"
        subtitle={`Welcome, ${props.fullName}. Track campaigns, balances, and deliverables.`}
        actions={
          <CustomizeLayoutButton onClick={() => layout.setPanelOpen(true)} />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active campaigns"
          value={String(props.activeCampaignCount)}
        />
        <StatCard label="Total invoiced" value={money(props.totalInvoiced)} />
        <StatCard
          label="Amount you owe"
          value={money(props.balance)}
          tone={props.balance > 0 ? "warn" : "good"}
        />
        <StatCard
          label="Deliverables awaiting decision"
          value={String(props.pendingCount)}
          tone={props.pendingCount ? "warn" : undefined}
        />
        <Link href="/app/change-requests" className="block">
          <StatCard
            label="Change requests pending"
            value={String(props.pendingChangeRequestCount)}
            tone={props.pendingChangeRequestCount ? "warn" : "good"}
            hint="Open Request a change"
          />
        </Link>
        <Link href="/app/contracts/documents" className="block">
          <StatCard
            label="Contracts awaiting signature"
            value={String(props.awaitingSignature)}
            tone={props.awaitingSignature ? "warn" : "good"}
            hint="Open Contracts & Documents"
          />
        </Link>
      </div>

      {blocks.length === 0 ? (
        <div className="mt-8 rounded-box border border-dashed border-base-300 bg-base-200/40 p-10 text-center">
          <p className="font-semibold">All sections are hidden</p>
          <p className="mt-1 text-sm opacity-60">
            Use Customize layout to show campaigns, balance, or approvals.
          </p>
          <CustomizeLayoutButton
            className="btn btn-primary btn-sm mt-4 gap-2"
            onClick={() => layout.setPanelOpen(true)}
          />
        </div>
      ) : (
        blocks.map((block, idx) => {
          if (block.type === "pair") {
            return (
              <section
                key={`pair-${block.left}-${block.right}-${idx}`}
                className="mt-8 grid gap-6 lg:grid-cols-2"
              >
                <SectionCard id={block.left} props={props} />
                <SectionCard id={block.right} props={props} />
              </section>
            );
          }
          return (
            <section key={`${block.id}-${idx}`} className="mt-8">
              <SectionCard id={block.id} props={props} />
            </section>
          );
        })
      )}

      {layout.panelOpen ? (
        <DashboardCustomizePanel
          prefs={layout.prefs}
          sections={CUSTOMER_DASHBOARD_SECTIONS}
          onClose={() => layout.setPanelOpen(false)}
          onToggle={layout.toggleHidden}
          onMove={layout.move}
          onRestore={layout.restoreDefaults}
        />
      ) : null}
    </div>
  );
}

function SectionCard({
  id,
  props,
}: {
  id: CustomerDashboardSectionId;
  props: CustomerDashboardBodyProps;
}) {
  switch (id) {
    case "campaigns":
      return <CampaignsSection campaigns={props.campaigns} />;
    case "balance":
      return (
        <BalanceSection
          balance={props.balance}
          totalInvoiced={props.totalInvoiced}
          nextDueLabel={props.nextDueLabel}
          overdueTotal={props.overdueTotal}
          openInvoices={props.openInvoices}
          invoiceCount={props.invoiceCount}
        />
      );
    case "approvals":
      return <ApprovalsSection pending={props.pendingApprovals} />;
    default:
      return null;
  }
}

function CampaignsSection({
  campaigns,
}: {
  campaigns: CustomerCampaignRow[];
}) {
  return (
    <div>
      <h2 className="mb-3 text-xl font-bold text-[#0b1f3a]">
        Campaign progress
      </h2>
      {campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="When Rebel Marketing launches work for your account, progress will appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
          <table className="table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Timeline</th>
                <th>Budget used</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="font-medium">{c.campaign_name}</div>
                    <div className="text-xs opacity-60">{c.campaign_type}</div>
                  </td>
                  <td>
                    <StatusBadge status={c.campaign_status} />
                  </td>
                  <td className="whitespace-nowrap text-sm opacity-80">
                    {c.start_date} → {c.end_date}
                  </td>
                  <td className="text-sm">
                    {money(c.spent)}
                    {c.budget > 0 ? (
                      <span className="opacity-60"> / {money(c.budget)}</span>
                    ) : null}
                  </td>
                  <td className="min-w-[10rem]">
                    <div className="mb-1 flex justify-between text-xs opacity-70">
                      <span>Timeline {c.timePct}%</span>
                      <span>Spend {c.pctUsed}%</span>
                    </div>
                    <progress
                      className="progress progress-primary w-full"
                      value={c.timePct}
                      max={100}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BalanceSection({
  balance,
  totalInvoiced,
  nextDueLabel,
  overdueTotal,
  openInvoices,
  invoiceCount,
}: {
  balance: number;
  totalInvoiced: number;
  nextDueLabel: string | null;
  overdueTotal: number;
  openInvoices: CustomerInvoiceRow[];
  invoiceCount: number;
}) {
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [criteria, setCriteria] =
    useState<InvoiceSearchCriteria>(EMPTY_INVOICE_SEARCH);

  const isSearching = hasActiveInvoiceSearch(criteria);

  const visibleInvoices = useMemo(() => {
    const matched = openInvoices.filter((row) =>
      invoiceMatchesCriteria(row, criteria),
    );
    if (isSearching) return matched;
    return matched.slice(0, 8);
  }, [openInvoices, criteria, isSearching]);

  function setCriterion(key: keyof InvoiceSearchCriteria, value: string) {
    setCriteria((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-5">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-xl font-bold text-[#0b1f3a]">Amount you owe</h2>
        {balance > 0 ? (
          <PayAccountButton
            balance={openInvoices
              .filter((i) => !i.disputed)
              .reduce((s, i) => s + i.remaining, 0)}
            onResult={setMessage}
          />
        ) : null}
      </div>
      <p className="mb-4 text-sm opacity-70">
        Total remaining on open invoices after payments.
      </p>
      <div className="mb-2 text-3xl font-bold text-[#0b1f3a]">
        {money(balance)}
      </div>
      <p className="mb-4 text-sm opacity-70">
        Total invoiced:{" "}
        <span className="font-medium text-[#0b1f3a]">
          {money(totalInvoiced)}
        </span>
      </p>
      {balance > 0 ? (
        <div className="mb-4 space-y-1 text-sm">
          {nextDueLabel ? (
            <p>
              <span className="opacity-70">Next due: </span>
              <span className="font-medium">{nextDueLabel}</span>
            </p>
          ) : null}
          <p className={overdueTotal > 0 ? "text-error" : "opacity-70"}>
            Overdue: <span className="font-medium">{money(overdueTotal)}</span>
          </p>
        </div>
      ) : (
        <p className="mb-4 text-sm text-success">
          You&apos;re all caught up — nothing outstanding right now.
        </p>
      )}
      {message ? (
        <div
          className={`mb-4 alert text-sm ${
            message.type === "success" ? "alert-success" : "alert-error"
          }`}
          role="status"
        >
          {message.text}
        </div>
      ) : null}
      {balance > 0 ? (
        <div>
          <div className="mb-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium opacity-70">
                Search invoices (combine any fields)
              </p>
              {isSearching ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => setCriteria(EMPTY_INVOICE_SEARCH)}
                >
                  Clear all
                </button>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {INVOICE_SEARCH_FIELDS.map((field) => (
                <label key={field.key} className="form-control w-full">
                  <span className="mb-1 text-xs font-medium opacity-70">
                    {field.label}
                  </span>
                  <input
                    type="search"
                    className="input input-bordered input-sm w-full"
                    value={criteria[field.key]}
                    placeholder={field.placeholder}
                    onChange={(e) => setCriterion(field.key, e.target.value)}
                    aria-label={`Filter by ${field.label}`}
                  />
                </label>
              ))}
            </div>
          </div>
          {visibleInvoices.length === 0 ? (
            <p className="mb-2 text-sm opacity-60">
              No invoices match your search.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Paid</th>
                    <th className="text-right">Remaining</th>
                    <th className="text-right">Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleInvoices.map((i) => (
                    <tr key={i.id}>
                      <td className="font-medium">{i.invoice_number}</td>
                      <td className="whitespace-nowrap">
                        <div>{i.due_date}</div>
                        {i.overdue ? (
                          <span className="badge badge-error badge-sm mt-1">
                            Overdue
                          </span>
                        ) : i.dueSoon ? (
                          <span className="badge badge-warning badge-sm mt-1">
                            Due soon
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <StatusBadge status={i.status} />
                        {i.disputed ? (
                          <span className="badge badge-warning badge-sm mt-1 block w-fit">
                            Disputed
                          </span>
                        ) : null}
                      </td>
                      <td className="text-right">{money(i.total)}</td>
                      <td className="text-right">{money(i.paid)}</td>
                      <td className="text-right font-medium">
                        {money(i.remaining)}
                      </td>
                      <td className="text-right">
                        <PayInvoiceButton invoice={i} onResult={setMessage} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs opacity-60">
            Use Pay at the top for your full account balance, or pay a single
            invoice. Demo only — no real card charge.
          </p>
        </div>
      ) : invoiceCount === 0 ? (
        <p className="text-sm opacity-60">No invoices on file.</p>
      ) : null}
    </div>
  );
}

function PayAccountButton({
  balance,
  onResult,
}: {
  balance: number;
  onResult: (msg: { type: "success" | "error"; text: string } | null) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState(balance.toFixed(2));
  const titleId = "pay-account-balance";
  const amountId = `${titleId}-amount`;

  if (balance <= 0) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled
        title="No payable (non-disputed) balance"
      >
        Pay
      </button>
    );
  }

  function closeDialog() {
    if (pending) return;
    setOpen(false);
    setDialogError(null);
  }

  function openDialog() {
    onResult(null);
    setDialogError(null);
    setAmountInput(balance.toFixed(2));
    setOpen(true);
  }

  function confirmPay() {
    const amount = Number(amountInput);
    if (!(amount > 0)) {
      setDialogError("Payment amount must be greater than zero.");
      return;
    }
    if (amount > balance + 1e-9) {
      setDialogError(
        `Payment cannot exceed account balance of ${money(balance)}.`,
      );
      return;
    }

    setDialogError(null);
    onResult(null);
    startTransition(async () => {
      const result = await payAccountBalance(amount);
      if (!result.ok) {
        setDialogError(result.error);
        onResult({ type: "error", text: result.error });
        return;
      }
      const successText =
        result.accountRemaining <= 0
          ? `Account payment of ${money(result.amountApplied)} received. Invoices updated to Paid. You're all caught up!`
          : `Account payment of ${money(result.amountApplied)} applied across ${result.invoicesPaid} invoice${result.invoicesPaid === 1 ? "" : "s"} (statuses set to Paid or Partially Paid). Remaining ${money(result.accountRemaining)}.`;
      onResult({ type: "success", text: successText });
      router.refresh();
      setOpen(false);
    });
  }

  const parsedAmount = Number(amountInput);
  const canSubmit =
    !pending &&
    balance > 0 &&
    parsedAmount > 0 &&
    parsedAmount <= balance + 1e-9;

  return (
    <>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={balance <= 0}
        onClick={openDialog}
      >
        Pay
      </button>

      {open ? (
        <dialog className="modal modal-open" aria-labelledby={titleId}>
          <div className="modal-box max-w-md bg-white text-[#0b1f3a]">
            <h3 id={titleId} className="text-lg font-bold">
              Pay account balance
            </h3>
            <p className="mt-2 text-sm opacity-70">
              Apply a payment toward your total open balance. Funds are applied
              to invoices oldest due date first. Demo only — no real card charge.
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="opacity-70">Account balance</dt>
                <dd className="font-semibold">{money(balance)}</dd>
              </div>
            </dl>
            <label className="mt-4 block" htmlFor={amountId}>
              <span className="mb-1 block text-sm font-medium">
                Amount to pay
              </span>
              <input
                id={amountId}
                type="number"
                inputMode="decimal"
                min={0.01}
                max={balance}
                step="0.01"
                className="input input-bordered w-full"
                value={amountInput}
                disabled={pending}
                onChange={(e) => setAmountInput(e.target.value)}
              />
            </label>
            <p className="mt-1 text-xs opacity-60">
              Maximum {money(balance)}. Leave as-is to pay the full account.
            </p>
            {dialogError ? (
              <p className="mt-3 text-sm text-error" role="alert">
                {dialogError}
              </p>
            ) : null}
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={pending}
                onClick={closeDialog}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canSubmit}
                onClick={confirmPay}
              >
                {pending
                  ? "Paying…"
                  : `Pay ${Number.isFinite(parsedAmount) && parsedAmount > 0 ? money(parsedAmount) : money(0)}`}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button
              type="button"
              aria-label="Close account payment dialog"
              disabled={pending}
              onClick={closeDialog}
            >
              close
            </button>
          </form>
        </dialog>
      ) : null}
    </>
  );
}

function PayInvoiceButton({
  invoice,
  onResult,
}: {
  invoice: CustomerInvoiceRow;
  onResult: (msg: { type: "success" | "error"; text: string } | null) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dialogSuccess, setDialogSuccess] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState(
    invoice.remaining.toFixed(2),
  );
  const titleId = `pay-invoice-${invoice.id}`;
  const amountId = `${titleId}-amount`;

  function closeDialog() {
    if (pending) return;
    setOpen(false);
    setDialogError(null);
    setDialogSuccess(null);
  }

  function openDialog() {
    onResult(null);
    setDialogError(null);
    setDialogSuccess(null);
    setAmountInput(invoice.remaining.toFixed(2));
    setOpen(true);
  }

  function confirmPay() {
    const amount = Number(amountInput);
    if (!(amount > 0)) {
      setDialogError("Payment amount must be greater than zero.");
      return;
    }
    if (amount > invoice.remaining + 1e-9) {
      setDialogError(
        `Payment cannot exceed remaining balance of ${money(invoice.remaining)}.`,
      );
      return;
    }

    setDialogError(null);
    setDialogSuccess(null);
    onResult(null);
    startTransition(async () => {
      const result = await payInvoiceBalance(invoice.id, amount);
      if (!result.ok) {
        setDialogError(result.error);
        onResult({ type: "error", text: result.error });
        return;
      }
      const successText =
        result.newStatus === "Paid"
          ? `Payment received for ${invoice.invoice_number}. Status: Paid. Thank you!`
          : `Partial payment of ${money(amount)} applied to ${invoice.invoice_number}. Status: Partially Paid. Remaining ${money(result.remaining)}.`;
      setDialogSuccess(successText);
      onResult({ type: "success", text: successText });
      router.refresh();
      setOpen(false);
      setDialogSuccess(null);
    });
  }

  if (invoice.disputed) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        disabled
        title="Disputed invoices cannot be paid online"
      >
        Pay
      </button>
    );
  }

  const parsedAmount = Number(amountInput);
  const canSubmit =
    !pending &&
    invoice.remaining > 0 &&
    parsedAmount > 0 &&
    parsedAmount <= invoice.remaining + 1e-9;

  return (
    <>
      <button
        type="button"
        className="btn btn-primary btn-xs"
        disabled={invoice.remaining <= 0}
        onClick={openDialog}
      >
        Pay
      </button>

      {open ? (
        <dialog className="modal modal-open" aria-labelledby={titleId}>
          <div className="modal-box max-w-md bg-white text-[#0b1f3a]">
            <h3 id={titleId} className="text-lg font-bold">
              Confirm payment
            </h3>
            <p className="mt-2 text-sm opacity-70">
              Pay any amount up to the remaining balance. This demo payment
              stays in your customer portal — no real card is charged.
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="opacity-70">Invoice</dt>
                <dd className="font-medium">{invoice.invoice_number}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="opacity-70">Amount due</dt>
                <dd className="font-semibold">{money(invoice.remaining)}</dd>
              </div>
            </dl>
            <label className="mt-4 block" htmlFor={amountId}>
              <span className="mb-1 block text-sm font-medium">
                Amount to pay
              </span>
              <input
                id={amountId}
                type="number"
                inputMode="decimal"
                min={0.01}
                max={invoice.remaining}
                step="0.01"
                className="input input-bordered w-full"
                value={amountInput}
                disabled={pending}
                onChange={(e) => setAmountInput(e.target.value)}
              />
            </label>
            <p className="mt-1 text-xs opacity-60">
              Maximum {money(invoice.remaining)}. Leave as-is to pay in full.
            </p>
            {dialogError ? (
              <p className="mt-3 text-sm text-error" role="alert">
                {dialogError}
              </p>
            ) : null}
            {dialogSuccess ? (
              <p className="mt-3 text-sm text-success" role="status">
                {dialogSuccess}
              </p>
            ) : null}
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={pending}
                onClick={closeDialog}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canSubmit}
                onClick={confirmPay}
              >
                {pending
                  ? "Paying…"
                  : `Pay ${Number.isFinite(parsedAmount) && parsedAmount > 0 ? money(parsedAmount) : money(0)}`}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button
              type="button"
              aria-label="Close payment dialog"
              disabled={pending}
              onClick={closeDialog}
            >
              close
            </button>
          </form>
        </dialog>
      ) : null}
    </>
  );
}

function ApprovalsSection({
  pending,
}: {
  pending: CustomerApprovalRow[];
}) {
  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-5">
      <h2 className="mb-1 text-xl font-bold text-[#0b1f3a]">
        Approve or reject deliverables
      </h2>
      <p className="mb-4 text-sm opacity-70">
        Review creative and campaign deliverables waiting on your decision.
      </p>
      {pending.length === 0 ? (
        <p className="text-sm opacity-60">
          Nothing waiting for approval right now.
        </p>
      ) : (
        <ul className="space-y-4">
          {pending.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-[#0b1f3a14] bg-[#f7f9fc] p-4"
            >
              <div className="mb-1 text-sm font-semibold text-[#0b1f3a]">
                {a.campaign_name}
              </div>
              <div className="mb-1 text-xs uppercase tracking-wide opacity-60">
                {a.approval_type} · requested {a.requested_date}
              </div>
              <p className="mb-3 text-sm">{a.description}</p>
              <UpdateApprovalStatusForm
                approvalId={a.id}
                currentStatus={a.approval_status}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
