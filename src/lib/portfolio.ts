import type { UserRole } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Client IDs visible for finance/ops for the current role. */
export async function getManagedClientIds(
  supabase: SupabaseClient,
  userId: string,
  role: UserRole,
): Promise<string[] | "all"> {
  if (role === "agency_manager" || role === "billing") {
    return "all";
  }
  if (role === "account_manager") {
    const { data } = await supabase
      .from("clients")
      .select("id")
      .eq("account_manager_id", userId);
    return (data ?? []).map((c) => c.id);
  }
  return [];
}

export function filterByClientIds<T extends { client_id?: string | null; id?: string }>(
  rows: T[],
  clientIds: string[] | "all",
  idField: "client_id" | "id" = "client_id",
): T[] {
  if (clientIds === "all") return rows;
  const set = new Set(clientIds);
  return rows.filter((r) => {
    const id = idField === "id" ? r.id : r.client_id;
    return id != null && set.has(id);
  });
}
