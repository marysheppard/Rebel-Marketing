import { money } from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = { from: (table: string) => any };

/** Notify agency managers that a cost needs approval. */
export async function notifyAgencyAfterCostRecorded(
  supabase: AnySupabase,
  input: {
    amount: number;
    campaignName: string;
    costType: string;
  },
) {
  const { data: managers } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "agency_manager");

  const rows = (managers ?? []).map((m: { id: string }) => ({
    user_id: m.id,
    title: "Cost awaiting approval",
    body: `${money(input.amount)} · ${input.costType} on ${input.campaignName} needs your review and approval.`,
    href: "/app/costs?approval=pending",
  }));

  if (rows.length > 0) {
    await supabase.from("notifications").insert(rows);
  }

  return { ok: true as const };
}
