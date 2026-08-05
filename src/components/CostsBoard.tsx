"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CostByCampaignChart, CostTypePieChart } from "@/components/Charts";
import { CreateCostForm } from "@/components/forms";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";
import { money } from "@/lib/format";

export type CostBoardItem = {
  id: string;
  cost_date: string;
  campaign_id: string | null;
  campaign_name: string;
  cost_type: string;
  description: string;
  amount: number;
  approved: boolean;
  pass_through: boolean;
};

function CostCard({ item }: { item: CostBoardItem }) {
  return (
    <article className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-semibold">{money(item.amount)}</p>
          <p className="mt-1 text-sm font-medium">{item.cost_type}</p>
          <p className="mt-1 text-xs opacity-60">
            {item.campaign_id ? (
              <Link
                href={`/app/campaigns/${item.campaign_id}`}
                className="link link-hover"
              >
                {item.campaign_name}
              </Link>
            ) : (
              "—"
            )}
            {" · "}
            {item.cost_date}
          </p>
          {item.description ? (
            <p className="mt-2 line-clamp-2 text-sm opacity-70">
              {item.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1">
          {!item.approved ? (
            <span className="badge badge-warning badge-sm">Unapproved</span>
          ) : (
            <span className="badge badge-success badge-sm">Approved</span>
          )}
          {item.pass_through ? (
            <span className="badge badge-info badge-sm">Pass-through</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function CostsBoard({
  items,
  showCreate,
  campaigns,
  typePie,
  byCampaign,
  totalSpend,
  unapprovedTotal,
  passThroughTotal,
  overBudgetCampaigns,
}: {
  items: CostBoardItem[];
  showCreate: boolean;
  campaigns: { id: string; label: string }[];
  typePie: { name: string; value: number }[];
  byCampaign: { name: string; amount: number }[];
  totalSpend: number;
  unapprovedTotal: number;
  passThroughTotal: number;
  overBudgetCampaigns: number;
}) {
  const [tab, setTab] = useState<"recent" | "unapproved" | "all">("recent");
  const [showForm, setShowForm] = useState(false);

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const recent = items.filter((c) => c.cost_date >= cutoff);
  const unapproved = items.filter((c) => !c.approved);

  return (
    <div>
      <PageHeader
        title="Costs"
        subtitle="Campaign spend with budget variance context"
        actions={
          showCreate ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? "Cancel" : "Record cost"}
            </button>
          ) : undefined
        }
      />

      {showCreate && showForm ? (
        <section className="mb-6 rounded-box border border-base-300 bg-base-100 p-6">
          <h2 className="mb-4 text-xl font-bold">Record cost</h2>
          <CreateCostForm campaigns={campaigns} />
        </section>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          title="No costs recorded"
          description="Track media, production, freelance, and pass-through expenses against campaigns."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total spend"
              value={money(totalSpend)}
              hint="All recorded costs"
            />
            <StatCard
              label="Unapproved"
              value={money(unapprovedTotal)}
              hint="Needs review"
              tone={unapprovedTotal > 0 ? "warn" : "good"}
            />
            <StatCard
              label="Pass-through"
              value={money(passThroughTotal)}
              hint="Billable to client"
            />
            <StatCard
              label="Over budget"
              value={String(overBudgetCampaigns)}
              hint="Campaigns over spend"
              tone={overBudgetCampaigns > 0 ? "bad" : "neutral"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CostTypePieChart data={typePie} />
            <CostByCampaignChart data={byCampaign} />
          </div>

          <div role="tablist" className="tabs tabs-boxed w-fit bg-base-200">
            <button
              type="button"
              role="tab"
              className={`tab ${tab === "recent" ? "tab-active" : ""}`}
              onClick={() => setTab("recent")}
            >
              Recent ({recent.length})
            </button>
            <button
              type="button"
              role="tab"
              className={`tab ${tab === "unapproved" ? "tab-active" : ""}`}
              onClick={() => setTab("unapproved")}
            >
              Unapproved ({unapproved.length})
            </button>
            <button
              type="button"
              role="tab"
              className={`tab ${tab === "all" ? "tab-active" : ""}`}
              onClick={() => setTab("all")}
            >
              All ({items.length})
            </button>
          </div>

          {tab === "recent" ? (
            recent.length === 0 ? (
              <p className="rounded-box border border-base-300 bg-base-100 p-6 text-sm opacity-60">
                No costs in the last 30 days.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {recent.map((c) => (
                  <CostCard key={c.id} item={c} />
                ))}
              </div>
            )
          ) : null}

          {tab === "unapproved" ? (
            unapproved.length === 0 ? (
              <p className="rounded-box border border-base-300 bg-base-100 p-6 text-sm opacity-60">
                Everything is approved.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {unapproved.map((c) => (
                  <CostCard key={c.id} item={c} />
                ))}
              </div>
            )
          ) : null}

          {tab === "all" ? (
            <div className="overflow-x-auto rounded-box border border-base-300">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Campaign</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th className="text-right">Amount</th>
                    <th>Approved</th>
                    <th>Pass-through</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id}>
                      <td>{c.cost_date}</td>
                      <td>
                        {c.campaign_id ? (
                          <Link
                            href={`/app/campaigns/${c.campaign_id}`}
                            className="link link-hover"
                          >
                            {c.campaign_name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{c.cost_type}</td>
                      <td className="max-w-xs truncate">{c.description || "—"}</td>
                      <td className="text-right">{money(c.amount)}</td>
                      <td>
                        {c.approved ? (
                          <span className="badge badge-success badge-sm">Yes</span>
                        ) : (
                          <span className="badge badge-warning badge-sm">No</span>
                        )}
                      </td>
                      <td>
                        {c.pass_through ? (
                          <span className="badge badge-info badge-sm">Yes</span>
                        ) : (
                          <span className="badge badge-ghost badge-sm">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
