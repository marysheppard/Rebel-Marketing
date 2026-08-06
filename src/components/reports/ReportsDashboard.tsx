"use client";

import { PageHeader } from "@/components/ui";
import { ControlTower } from "@/components/reports/ControlTower";
import { ReportsCharts } from "@/components/reports/ReportsCharts";
import { ReportsKpiStrip } from "@/components/reports/ReportsKpiStrip";
import {
  BillingApprovalCards,
  BudgetTable,
  CampaignProfitTable,
  ClientProfitTable,
} from "@/components/reports/ReportsTables";
import type { ReportsDashboardProps } from "@/components/reports/types";

export function ReportsDashboard({
  alerts,
  clientProfit,
  campaignProfit,
  budgetPerf,
  billingPerf,
  approvalPerf,
  unbilled,
  pulse,
}: ReportsDashboardProps) {
  const unbilledHours = unbilled.reduce((s, r) => s + r.hours, 0);
  const critical = alerts.filter((a) => a.severity === "error").length;
  const approvalStatus = [
    { name: "Pending", value: approvalPerf.pending },
    { name: "Approved", value: approvalPerf.approved },
    { name: "Rejected", value: approvalPerf.rejected },
    { name: "Changes Requested", value: approvalPerf.changes },
  ];

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-6 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(11,31,58,0.08),_transparent_65%)]"
      />
      <div className="relative space-y-6">
        <PageHeader
          title="Reports"
          subtitle="Finance cockpit — profitability, budgets, cash, and controls"
        />

        <div className="overflow-hidden rounded-box border border-[#0b1f3a]/20 bg-gradient-to-r from-[#0b1f3a] to-[#153a66] text-white shadow-md">
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200/80">
                Operational pulse
              </p>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-white/90">
                {pulse}
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <div className="rounded-box border border-white/15 bg-white/10 px-4 py-2 text-center backdrop-blur-sm">
                <div className="text-[10px] uppercase tracking-wide text-white/60">
                  Critical
                </div>
                <div className="text-2xl font-bold tabular-nums">{critical}</div>
              </div>
              <div className="rounded-box border border-white/15 bg-white/10 px-4 py-2 text-center backdrop-blur-sm">
                <div className="text-[10px] uppercase tracking-wide text-white/60">
                  Open flags
                </div>
                <div className="text-2xl font-bold tabular-nums">{alerts.length}</div>
              </div>
            </div>
          </div>
        </div>

        <ControlTower alerts={alerts} />

        <ReportsKpiStrip
          clientProfit={clientProfit}
          budgetPerf={budgetPerf}
          billingPerf={billingPerf}
          approvalPerf={approvalPerf}
          unbilledHours={unbilledHours}
        />

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#0b1f3a]">Performance charts</h2>
              <p className="text-sm opacity-65">All-time portfolio view</p>
            </div>
          </div>
          <ReportsCharts
            clientProfit={clientProfit}
            campaignProfit={campaignProfit}
            budgetPerf={budgetPerf}
            approvalStatus={approvalStatus}
            unbilled={unbilled}
          />
        </section>

        <div className="space-y-6">
          <ClientProfitTable rows={clientProfit} />
          <CampaignProfitTable rows={campaignProfit} />
          <BudgetTable rows={budgetPerf} />
          <BillingApprovalCards
            billing={billingPerf}
            approvals={approvalPerf}
            unbilled={unbilled}
          />
        </div>
      </div>
    </div>
  );
}
