import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, profile: null as Profile | null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { supabase, profile: profile as Profile | null, userId: user.id };
}

export function canManageClients(role: UserRole) {
  return role === "agency_manager" || role === "account_manager";
}

export function canManageContracts(role: UserRole) {
  return role === "agency_manager" || role === "account_manager";
}

export function canManageCampaigns(role: UserRole) {
  return role === "agency_manager" || role === "account_manager";
}

export function canLogWork(role: UserRole) {
  return (
    role === "agency_manager" ||
    role === "account_manager" ||
    role === "marketing"
  );
}

export function canManageCosts(role: UserRole) {
  return (
    role === "agency_manager" ||
    role === "account_manager" ||
    role === "marketing"
  );
}

export function canCreateApprovals(role: UserRole) {
  return (
    role === "agency_manager" ||
    role === "account_manager" ||
    role === "marketing"
  );
}

export function canManageBilling(role: UserRole) {
  return role === "agency_manager" || role === "billing";
}

export function canRecordPayments(role: UserRole) {
  return canManageBilling(role);
}

export function isClientRole(role: UserRole) {
  return role === "client";
}

export function isEmployeeRole(role: UserRole) {
  return !isClientRole(role);
}
