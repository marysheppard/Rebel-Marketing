"use client";

import Link from "next/link";

const DEMO = {
  badge: "Client portal",
  name: "Example Client",
  nav: ["Dashboard", "Campaigns", "Approvals", "Invoices", "Contracts"],
  stats: [
    { label: "Open invoices", value: "3", hint: "Awaiting payment" },
    { label: "Balance due", value: "$12.4K", hint: "Net 30" },
    { label: "Pending approvals", value: "2", hint: "Needs your sign-off" },
  ],
  listTitle: "Needs attention",
  listItems: [
    "Campaign awaiting sign-off — Holiday email",
    "Invoice INV-1042 due Aug 18",
  ],
  bars: [
    { label: "Approvals cleared", pct: 72 },
    { label: "Campaign progress", pct: 58 },
  ],
  ctaLabel: "Open client portal",
  ctaHref: "/login?portal=client",
};

export function PublicRolePreview() {
  return (
    <div className="public-role-preview-panel mt-10 overflow-hidden rounded-2xl border border-[#0b1f3a14] bg-white shadow-[0_20px_50px_#0b1f3a12]">
      <div className="flex items-center justify-between gap-3 border-b border-[#0b1f3a10] bg-[#f7f9fc] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="text-sm font-bold tracking-tight text-[#0b1f3a]">
            {DEMO.name}
          </div>
          <div className="text-xs text-[#1e3a5f]/70">Rebel Marketing</div>
        </div>
        <span className="shrink-0 rounded-full bg-[#0b1f3a] px-2.5 py-1 text-[11px] font-semibold text-white">
          {DEMO.badge}
        </span>
      </div>

      <div className="grid sm:grid-cols-[9.5rem_1fr]">
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

        <div className="space-y-5 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {DEMO.stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-[#0b1f3a12] bg-[#f7f9fc] px-3 py-3"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1e3a5f]/60">
                  {stat.label}
                </div>
                <div className="mt-1 text-2xl font-bold tracking-tight text-[#0b1f3a]">
                  {stat.value}
                </div>
                <div className="mt-0.5 text-xs text-[#1e3a5f]/70">
                  {stat.hint}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold text-[#0b1f3a]">
                {DEMO.listTitle}
              </h3>
              <ul className="mt-2 space-y-2">
                {DEMO.listItems.map((item) => (
                  <li
                    key={item}
                    className="rounded-lg border border-[#0b1f3a10] px-3 py-2 text-sm text-[#1e3a5f]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0b1f3a]">Snapshot</h3>
              <ul className="mt-3 space-y-3">
                {DEMO.bars.map((bar) => (
                  <li key={bar.label}>
                    <div className="mb-1 flex justify-between text-xs font-medium text-[#1e3a5f]">
                      <span>{bar.label}</span>
                      <span>{bar.pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#0b1f3a12]">
                      <div
                        className="h-full rounded-full bg-[#0b1f3a]"
                        style={{ width: `${bar.pct}%` }}
                      />
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
