"use client";

import Link from "next/link";

const DEMO = {
  clientName: "Example Client",
  nav: ["Dashboard", "Contracts & Documents"] as const,
  stats: [
    { label: "Active campaigns", value: "2" },
    { label: "Total invoiced", value: "$48.2K" },
    { label: "Amount you owe", value: "$12.4K", tone: "warn" as const },
    {
      label: "Deliverables awaiting decision",
      value: "2",
      tone: "warn" as const,
    },
    {
      label: "Contracts awaiting signature",
      value: "1",
      tone: "warn" as const,
      hint: "Open Contracts & Documents",
    },
  ],
  campaigns: [
    {
      name: "Holiday email series",
      type: "Email",
      status: "Active",
      dates: "2026-07-01 → 2026-09-30",
      spent: "$18.4K",
      budget: "$25.0K",
      timePct: 58,
      spendPct: 74,
    },
    {
      name: "Brand awareness — Q3",
      type: "Paid social",
      status: "Active",
      dates: "2026-06-15 → 2026-08-31",
      spent: "$9.1K",
      budget: "$12.0K",
      timePct: 72,
      spendPct: 76,
    },
  ],
  balance: "$12.4K",
  totalInvoiced: "$48.2K",
  nextDue: "INV-1042 · Aug 18, 2026",
  overdue: "$0",
  invoices: [
    {
      number: "INV-1042",
      due: "2026-08-18",
      status: "Sent",
      total: "$8.2K",
      paid: "$0",
      remaining: "$8.2K",
      dueSoon: true,
    },
    {
      number: "INV-1038",
      due: "2026-09-01",
      status: "Sent",
      total: "$4.2K",
      paid: "$0",
      remaining: "$4.2K",
      dueSoon: false,
    },
  ],
  approvals: [
    {
      campaign: "Holiday email series",
      type: "Creative",
      requested: "2026-08-04",
      description: "Final hero creative and subject-line variants for week 1.",
    },
    {
      campaign: "Brand awareness — Q3",
      type: "Campaign plan",
      requested: "2026-08-02",
      description: "August media plan and audience targeting for sign-off.",
    },
  ],
  ctaLabel: "Open client portal",
  ctaHref: "/login?portal=client",
};

function PreviewBadge({ status }: { status: string }) {
  return (
    <span className="badge badge-sm badge-ghost border border-[#0b1f3a20] text-[#0b1f3a]">
      {status}
    </span>
  );
}

export function PublicRolePreview() {
  return (
    <div className="public-role-preview-panel mt-10 overflow-hidden rounded-2xl border border-[#0b1f3a14] bg-white shadow-[0_20px_50px_#0b1f3a12]">
      <div className="flex items-center justify-between gap-3 border-b border-[#0b1f3a10] bg-[#f7f9fc] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="text-sm font-bold tracking-tight text-[#0b1f3a]">
            Rebel Marketing
          </div>
          <div className="text-xs text-[#1e3a5f]/70">Customer Dashboard</div>
        </div>
        <span className="shrink-0 rounded-full bg-[#0b1f3a] px-2.5 py-1 text-[11px] font-semibold text-white">
          Sample preview
        </span>
      </div>

      <div className="grid sm:grid-cols-[10.5rem_1fr]">
        <aside className="hidden border-r border-[#0b1f3a10] bg-[#eef3f9] p-3 sm:block">
          <ul className="space-y-1">
            {DEMO.nav.map((item, i) => (
              <li
                key={item}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                  i === 0
                    ? "bg-white text-[#0b1f3a] shadow-sm"
                    : "text-[#1e3a5f]/75"
                }`}
              >
                {item}
              </li>
            ))}
          </ul>
        </aside>

        <div className="space-y-6 p-4 sm:p-5">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-[#0b1f3a]">
              Customer Dashboard
            </h3>
            <p className="mt-1 text-sm text-[#1e3a5f]/80">
              Welcome, {DEMO.clientName}. Track campaigns, balances, and
              deliverables.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO.stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-[#0b1f3a12] bg-[#f7f9fc] px-3 py-3"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1e3a5f]/60">
                  {stat.label}
                </div>
                <div
                  className={`mt-1 text-2xl font-bold tracking-tight ${
                    stat.tone === "warn" ? "text-[#b45309]" : "text-[#0b1f3a]"
                  }`}
                >
                  {stat.value}
                </div>
                {"hint" in stat && stat.hint ? (
                  <div className="mt-0.5 text-xs text-[#1e3a5f]/70">
                    {stat.hint}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div>
            <h4 className="mb-3 text-lg font-bold text-[#0b1f3a]">
              Campaign progress
            </h4>
            <div className="overflow-x-auto rounded-xl border border-[#0b1f3a12]">
              <table className="table table-sm">
                <thead>
                  <tr className="text-[#1e3a5f]/70">
                    <th>Campaign</th>
                    <th>Status</th>
                    <th>Timeline</th>
                    <th>Budget used</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO.campaigns.map((c) => (
                    <tr key={c.name}>
                      <td>
                        <div className="font-medium text-[#0b1f3a]">
                          {c.name}
                        </div>
                        <div className="text-xs opacity-60">{c.type}</div>
                      </td>
                      <td>
                        <PreviewBadge status={c.status} />
                      </td>
                      <td className="whitespace-nowrap text-xs opacity-80">
                        {c.dates}
                      </td>
                      <td className="text-xs">
                        {c.spent}
                        <span className="opacity-60"> / {c.budget}</span>
                      </td>
                      <td className="min-w-[8rem]">
                        <div className="mb-1 flex justify-between text-[10px] opacity-70">
                          <span>Timeline {c.timePct}%</span>
                          <span>Spend {c.spendPct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#0b1f3a12]">
                          <div
                            className="h-full rounded-full bg-[#0b1f3a]"
                            style={{ width: `${c.timePct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[#0b1f3a12] bg-white p-4">
              <h4 className="mb-1 text-lg font-bold text-[#0b1f3a]">
                Amount you owe
              </h4>
              <p className="mb-3 text-xs opacity-70">
                Total remaining on open invoices after payments.
              </p>
              <div className="mb-1 text-2xl font-bold text-[#0b1f3a]">
                {DEMO.balance}
              </div>
              <p className="mb-3 text-xs opacity-70">
                Total invoiced:{" "}
                <span className="font-medium text-[#0b1f3a]">
                  {DEMO.totalInvoiced}
                </span>
              </p>
              <div className="mb-3 space-y-1 text-xs">
                <p>
                  <span className="opacity-70">Next due: </span>
                  <span className="font-medium">{DEMO.nextDue}</span>
                </p>
                <p className="opacity-70">
                  Overdue: <span className="font-medium">{DEMO.overdue}</span>
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="table table-xs">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th className="text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DEMO.invoices.map((i) => (
                      <tr key={i.number}>
                        <td className="font-medium">{i.number}</td>
                        <td className="whitespace-nowrap">
                          <div>{i.due}</div>
                          {i.dueSoon ? (
                            <span className="badge badge-warning badge-sm mt-0.5">
                              Due soon
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <PreviewBadge status={i.status} />
                        </td>
                        <td className="text-right font-medium">
                          {i.remaining}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-[#0b1f3a12] bg-white p-4">
              <h4 className="mb-1 text-lg font-bold text-[#0b1f3a]">
                Approve or reject deliverables
              </h4>
              <p className="mb-3 text-xs opacity-70">
                Review creative and campaign deliverables waiting on your
                decision.
              </p>
              <ul className="pointer-events-none space-y-3 select-none">
                {DEMO.approvals.map((a) => (
                  <li
                    key={a.campaign + a.type}
                    className="rounded-xl border border-[#0b1f3a14] bg-[#f7f9fc] p-3"
                  >
                    <div className="mb-0.5 text-sm font-semibold text-[#0b1f3a]">
                      {a.campaign}
                    </div>
                    <div className="mb-1 text-[10px] uppercase tracking-wide opacity-60">
                      {a.type} · requested {a.requested}
                    </div>
                    <p className="mb-2 text-xs text-[#1e3a5f]">{a.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="btn btn-success btn-xs opacity-80">
                        Approve
                      </span>
                      <span className="btn btn-warning btn-xs opacity-80">
                        Request changes
                      </span>
                      <span className="btn btn-error btn-xs btn-outline opacity-80">
                        Reject
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <Link
              href={DEMO.ctaHref}
              className="btn border-none bg-[#0b1f3a] px-5 font-semibold text-white hover:bg-[#163054]"
            >
              {DEMO.ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
