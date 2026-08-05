"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CampaignBudgetHealthChart,
  CampaignStatusPieChart,
} from "@/components/Charts";
import { CreateCampaignForm } from "@/components/forms";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { money } from "@/lib/format";

export type CampaignBoardItem = {
  id: string;
  client_id: string;
  campaign_name: string;
  client_name: string;
  campaign_type: string;
  campaign_status: string;
  start_date: string;
  end_date: string;
  budget: number;
  spent: number;
  remaining: number;
  health: "over" | "near" | "under" | "unknown";
};

function BudgetBadge({ health }: { health: CampaignBoardItem["health"] }) {
  const cls =
    health === "over"
      ? "badge-error"
      : health === "near"
        ? "badge-warning"
        : health === "under"
          ? "badge-success"
          : "badge-ghost";
  const label =
    health === "over"
      ? "Over budget"
      : health === "near"
        ? "Near budget"
        : health === "under"
          ? "Under budget"
          : "No budget";
  return <span className={`badge badge-sm ${cls}`}>{label}</span>;
}

function BudgetProgress({ budget, spent }: { budget: number; spent: number }) {
  if (budget <= 0) {
    return <p className="text-xs opacity-50">No budget set</p>;
  }
  const pct = Math.min(100, Math.round((spent / budget) * 100));
  const over = spent > budget;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs opacity-70">
        <span>
          {money(spent)} / {money(budget)}
        </span>
        <span className={over ? "text-error font-medium" : ""}>{pct}%</span>
      </div>
      <progress
        className={`progress h-2 w-full ${over ? "progress-error" : pct >= 85 ? "progress-warning" : "progress-success"}`}
        value={Math.min(spent, budget)}
        max={budget}
      />
    </div>
  );
}

function CampaignCard({ item }: { item: CampaignBoardItem }) {
  return (
    <article className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/app/campaigns/${item.id}`}
            className="link link-hover text-base font-semibold"
          >
            {item.campaign_name}
          </Link>
          <p className="mt-1 text-xs opacity-60">
            <Link
              href={`/app/clients/${item.client_id}`}
              className="link link-hover"
            >
              {item.client_name}
            </Link>
            {" · "}
            {item.campaign_type}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={item.campaign_status} />
          <BudgetBadge health={item.health} />
        </div>
      </div>
      <p className="mt-3 text-xs opacity-60">
        {item.start_date} → {item.end_date}
      </p>
      <div className="mt-3">
        <BudgetProgress budget={item.budget} spent={item.spent} />
      </div>
    </article>
  );
}

export function CampaignsBoard({
  items,
  showCreate,
  clients,
  contracts,
  statusPie,
  budgetHealthBars,
  activeCount,
  lateCount,
  overBudgetCount,
}: {
  items: CampaignBoardItem[];
  showCreate: boolean;
  clients: { id: string; label: string }[];
  contracts: { id: string; label: string; client_id: string }[];
  statusPie: { name: string; value: number }[];
  budgetHealthBars: { bucket: string; count: number }[];
  activeCount: number;
  lateCount: number;
  overBudgetCount: number;
}) {
  const [tab, setTab] = useState<"active" | "risk" | "all">("active");
  const [showForm, setShowForm] = useState(false);

  const active = items.filter((c) => c.campaign_status === "Active");
  const atRisk = items.filter(
    (c) =>
      c.campaign_status === "Late" ||
      c.health === "over" ||
      c.health === "near",
  );

  return (
    <div>
      <PageHeader
        title="Campaigns"
        subtitle="Delivery tracking with live budget health"
        actions={
          showCreate ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? "Cancel" : "New campaign"}
            </button>
          ) : undefined
        }
      />

      {showCreate && showForm ? (
        <section className="mb-6 rounded-box border border-base-300 bg-base-100 p-6">
          <h2 className="mb-4 text-xl font-bold">New campaign</h2>
          <CreateCampaignForm clients={clients} contracts={contracts} />
        </section>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          title="No campaigns"
          description="Launch a campaign under an active contract to track work, costs, and billing."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Active"
              value={String(activeCount)}
              hint="Currently running"
              tone={activeCount > 0 ? "good" : "neutral"}
            />
            <StatCard
              label="Late"
              value={String(lateCount)}
              hint="Past schedule"
              tone={lateCount > 0 ? "bad" : "neutral"}
            />
            <StatCard
              label="Over budget"
              value={String(overBudgetCount)}
              hint="Spend exceeds budget"
              tone={overBudgetCount > 0 ? "bad" : "neutral"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CampaignStatusPieChart data={statusPie} />
            <CampaignBudgetHealthChart data={budgetHealthBars} />
          </div>

          <div role="tablist" className="tabs tabs-boxed w-fit bg-base-200">
            <button
              type="button"
              role="tab"
              className={`tab ${tab === "active" ? "tab-active" : ""}`}
              onClick={() => setTab("active")}
            >
              Active ({active.length})
            </button>
            <button
              type="button"
              role="tab"
              className={`tab ${tab === "risk" ? "tab-active" : ""}`}
              onClick={() => setTab("risk")}
            >
              At risk ({atRisk.length})
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

          {tab === "active" ? (
            active.length === 0 ? (
              <p className="rounded-box border border-base-300 bg-base-100 p-6 text-sm opacity-60">
                No active campaigns right now.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {active.map((c) => (
                  <CampaignCard key={c.id} item={c} />
                ))}
              </div>
            )
          ) : null}

          {tab === "risk" ? (
            atRisk.length === 0 ? (
              <p className="rounded-box border border-base-300 bg-base-100 p-6 text-sm opacity-60">
                Nothing at risk. Budgets and schedules look healthy.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {atRisk.map((c) => (
                  <CampaignCard key={c.id} item={c} />
                ))}
              </div>
            )
          ) : null}

          {tab === "all" ? (
            <div className="overflow-x-auto rounded-box border border-base-300">
              <table className="table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th className="text-right">Budget</th>
                    <th className="text-right">Spent</th>
                    <th className="text-right">Remaining</th>
                    <th>Health</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} className="hover">
                      <td>
                        <Link
                          href={`/app/campaigns/${c.id}`}
                          className="link link-hover font-medium"
                        >
                          {c.campaign_name}
                        </Link>
                      </td>
                      <td>
                        <Link
                          href={`/app/clients/${c.client_id}`}
                          className="link link-hover"
                        >
                          {c.client_name}
                        </Link>
                      </td>
                      <td>{c.campaign_type}</td>
                      <td>
                        <StatusBadge status={c.campaign_status} />
                      </td>
                      <td className="text-right">{money(c.budget)}</td>
                      <td className="text-right">{money(c.spent)}</td>
                      <td
                        className={`text-right ${c.remaining < 0 ? "text-error" : ""}`}
                      >
                        {money(c.remaining)}
                      </td>
                      <td>
                        <BudgetBadge health={c.health} />
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
