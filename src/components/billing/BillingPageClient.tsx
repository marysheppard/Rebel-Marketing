"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ActiveInvoicesTable } from "@/components/billing/ActiveInvoicesTable";
import { BillingExportButton } from "@/components/billing/BillingExportButton";
import { DraftInvoicesList } from "@/components/billing/DraftInvoicesList";
import { InvoiceCsvButton } from "@/components/billing/InvoiceCsvButton";
import { InvoiceStatusBar } from "@/components/billing/InvoiceStatusBar";
import { PaidHistorySection } from "@/components/billing/PaidHistorySection";
import { ReadyToInvoicePanel } from "@/components/billing/ReadyToInvoicePanel";
import { PageHeader } from "@/components/ui";
import type { BillingInvoiceRow, UnbilledEntry } from "@/lib/billing";

type SectionKey = "ready" | "drafts" | "active" | "history";

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
  subtitle,
  badge,
  headerAction,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  subtitle?: string;
  badge?: string;
  headerAction?: React.ReactNode;
}) {
  return (
    <section className="rounded-box border border-base-300 bg-base-100 shadow-sm">
      <div className="flex w-full items-center gap-2 px-4 py-3">
        <button
          type="button"
          className="min-w-0 flex-1 text-left hover:opacity-90"
          onClick={onToggle}
          aria-expanded={open}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">{title}</h2>
            {badge ? (
              <span className="badge badge-ghost badge-sm">{badge}</span>
            ) : null}
          </div>
          {subtitle ? (
            <p className="mt-0.5 text-sm opacity-70">{subtitle}</p>
          ) : null}
        </button>
        {headerAction ? (
          <div className="flex shrink-0 items-center">{headerAction}</div>
        ) : null}
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square shrink-0"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
        >
          <ChevronDown
            className={`h-5 w-5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {open ? (
        <div className="border-t border-base-300 px-4 py-4">{children}</div>
      ) : null}
    </section>
  );
}

export function BillingPageClient({
  unbilled,
  drafts,
  active,
  history,
  allInvoices,
  canManage,
}: {
  unbilled: UnbilledEntry[];
  drafts: BillingInvoiceRow[];
  active: BillingInvoiceRow[];
  history: BillingInvoiceRow[];
  allInvoices: BillingInvoiceRow[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    ready: true,
    drafts: true,
    active: true,
    history: false,
  });

  function toggle(key: SectionKey) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function collapseAll() {
    setOpen({ ready: false, drafts: false, active: false, history: false });
  }

  function expandAll() {
    setOpen({ ready: true, drafts: true, active: true, history: true });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        subtitle="Turn approved work into invoices. Accounts Receivable handles collections and payments."
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={collapseAll}>
              Collapse all
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={expandAll}>
              Expand all
            </button>
            <BillingExportButton invoices={allInvoices} />
          </div>
        }
      />

      <InvoiceStatusBar invoices={allInvoices} />

      <div className="space-y-4">
        <CollapsibleSection
          title="Ready to Invoice"
          subtitle="Approved billable work ready to turn into invoices"
          badge={String(unbilled.length)}
          open={open.ready}
          onToggle={() => toggle("ready")}
        >
          <ReadyToInvoicePanel
            entries={unbilled}
            canManage={canManage}
            embedded
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Draft invoices"
          subtitle="Continue editing or send when ready"
          badge={String(drafts.length)}
          open={open.drafts}
          onToggle={() => toggle("drafts")}
          headerAction={
            <InvoiceCsvButton
              invoices={drafts}
              filename="billing-draft-invoices"
              label="draft invoices"
            />
          }
        >
          <DraftInvoicesList drafts={drafts} canManage={canManage} embedded />
        </CollapsibleSection>

        <CollapsibleSection
          title="Recently sent / active"
          subtitle="Open invoices awaiting payment"
          badge={String(active.length)}
          open={open.active}
          onToggle={() => toggle("active")}
          headerAction={
            <InvoiceCsvButton
              invoices={active}
              filename="billing-active-invoices"
              label="active invoices"
            />
          }
        >
          <ActiveInvoicesTable
            invoices={active}
            canManage={canManage}
            embedded
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Paid / History"
          subtitle="Paid and canceled invoices"
          badge={String(history.length)}
          open={open.history}
          onToggle={() => toggle("history")}
          headerAction={
            <InvoiceCsvButton
              invoices={history}
              filename="billing-paid-history-invoices"
              label="paid / history invoices"
            />
          }
        >
          <PaidHistorySection invoices={history} embedded />
        </CollapsibleSection>
      </div>
    </div>
  );
}
