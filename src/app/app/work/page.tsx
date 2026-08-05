import { CreateWorkForm } from "@/components/forms";
import { NamedBarChart } from "@/components/tasks/NamedBarChart";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { num } from "@/lib/format";
import { canLogWork, getProfile, isClientRole } from "@/lib/page-auth";
import Link from "next/link";

export default async function WorkPage() {
  const { supabase, profile, userId } = await getProfile();
  if (!profile || !userId) return null;

  const [{ data: work }, { data: campaigns }] = await Promise.all([
    supabase
      .from("work_entries")
      .select("*, campaigns(campaign_name, client_id), profiles(full_name)")
      .order("work_date", { ascending: false }),
    supabase
      .from("campaigns")
      .select("id, campaign_name, campaign_status")
      .in("campaign_status", ["Active", "Late", "On Hold"])
      .order("campaign_name"),
  ]);

  const list = work ?? [];
  const showForm = canLogWork(profile.role) && !isClientRole(profile.role);
  const activeCampaigns = (campaigns ?? []).map((c) => ({
    id: c.id,
    label: c.campaign_name,
  }));

  const byType = new Map<string, number>();
  for (const w of list) {
    const key = String(w.work_type || "Other");
    byType.set(key, (byType.get(key) ?? 0) + num(w.hours));
  }
  const typeChart = [...byType.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div>
      <PageHeader
        title="Work"
        subtitle="Billable and non-billable delivery hours"
      />

      {list.length === 0 ? (
        <EmptyState
          title="No work entries"
          description="Log strategy, creative, production, and account hours against active campaigns."
        />
      ) : (
        <>
          <div className="mb-8 max-w-xl">
            <NamedBarChart
              title="Hours by work type"
              data={typeChart}
              valueKey="hours"
              color="#38bdf8"
            />
          </div>
          <div className="overflow-x-auto rounded-box border border-base-300">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Campaign</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th className="text-right">Hours</th>
                  <th>Billable</th>
                  <th>Approval</th>
                  <th>Billed</th>
                  <th>Logged by</th>
                </tr>
              </thead>
              <tbody>
                {list.map((w) => (
                  <tr key={w.id}>
                    <td>{w.work_date}</td>
                    <td>
                      <Link
                        href={`/app/campaigns/${w.campaign_id}`}
                        className="link link-hover"
                      >
                        {(w as { campaigns?: { campaign_name: string } })
                          .campaigns?.campaign_name ?? "—"}
                      </Link>
                    </td>
                    <td>{w.work_type}</td>
                    <td className="max-w-xs truncate">
                      {w.description || "—"}
                    </td>
                    <td className="text-right">{w.hours}</td>
                    <td>{w.billable ? "Yes" : "No"}</td>
                    <td>
                      <StatusBadge status={w.approval_status} />
                    </td>
                    <td>{w.billed ? "Yes" : "No"}</td>
                    <td>
                      {(w as { profiles?: { full_name: string } }).profiles
                        ?.full_name ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showForm ? (
        <section className="mt-8 rounded-box border border-base-300 bg-base-100 p-6">
          <h2 className="mb-4 text-xl font-bold">Log work</h2>
          <CreateWorkForm campaigns={activeCampaigns} userId={userId} />
        </section>
      ) : null}
    </div>
  );
}
