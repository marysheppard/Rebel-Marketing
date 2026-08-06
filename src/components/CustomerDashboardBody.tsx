"use client";

import Link from "next/link";
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
};

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
  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-5">
      <h2 className="mb-1 text-xl font-bold text-[#0b1f3a]">Amount you owe</h2>
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
      {balance > 0 ? (
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
              </tr>
            </thead>
            <tbody>
              {openInvoices.slice(0, 8).map((i) => (
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
                  </td>
                  <td className="text-right">{money(i.total)}</td>
                  <td className="text-right">{money(i.paid)}</td>
                  <td className="text-right font-medium">
                    {money(i.remaining)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : invoiceCount === 0 ? (
        <p className="text-sm opacity-60">No invoices on file.</p>
      ) : null}
    </div>
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
