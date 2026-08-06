import { PortfolioMediaByMonthChart } from "@/components/Charts";
import { StatCard } from "@/components/ui";

export function PortfolioGrowthSection({
  activeClients,
  newClientsQuarter,
  activeCampaigns,
  conversions30d,
  portfolioByMonth,
}: {
  activeClients: number;
  newClientsQuarter: number;
  activeCampaigns: number;
  conversions30d: number;
  portfolioByMonth: {
    month: string;
    conversions: number;
    spend: number;
    clicks: number;
  }[];
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-bold text-[#0b1f3a]">Portfolio growth</h2>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active clients"
          value={String(activeClients)}
          hint="Status Active"
          tone="good"
        />
        <StatCard
          label="New this quarter"
          value={String(newClientsQuarter)}
          hint="Joined in current quarter"
        />
        <StatCard
          label="Active campaigns"
          value={String(activeCampaigns)}
          hint="Running or late"
        />
        <StatCard
          label="Conversions (30d)"
          value={conversions30d.toLocaleString()}
          hint="Across your scoped work"
        />
      </div>
      <PortfolioMediaByMonthChart data={portfolioByMonth} />
    </section>
  );
}
