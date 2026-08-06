import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isClientRole,
  isEmployeeRole,
  isAdminOnlyAppPath,
  isClientPortalHome,
} from "@/lib/access";
import type { Profile, UserRole } from "@/lib/types";

export {
  isAdminOnlyAppPath,
  isClientPortalHome,
  isClientRole,
  isEmployeeRole,
};

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

/** Require an authenticated profile with one of the given roles; otherwise redirect to /app. */
export async function requireRoles(roles: UserRole[]) {
  const ctx = await getProfile();
  if (!ctx.profile || !ctx.userId) redirect("/login");
  if (!roles.includes(ctx.profile.role)) redirect("/app");
  return ctx as {
    supabase: typeof ctx.supabase;
    profile: Profile;
    userId: string;
  };
}

export async function requireEmployee() {
  const ctx = await getProfile();
  if (!ctx.profile || !ctx.userId) redirect("/login");
  if (isClientRole(ctx.profile.role)) redirect("/app");
  return ctx as {
    supabase: typeof ctx.supabase;
    profile: Profile;
    userId: string;
  };
}

export function canManageClients(role: UserRole) {
  return role === "agency_manager" || role === "account_manager";
}

export function canManageContracts(role: UserRole) {
  return role === "agency_manager" || role === "account_manager";
}

export function canFinalizeContract(role: UserRole) {
  return canManageContracts(role);
}

export function canCountersign(role: UserRole) {
  return role === "agency_manager" || role === "account_manager";
}

export function canSignAsClient(role: UserRole) {
  return role === "client";
}

export function canManageCampaigns(role: UserRole) {
  return role === "agency_manager" || role === "account_manager";
}

/** Marketing employee (EMP-1003) — this branch’s employee dashboard audience */
export function isMarketingRole(role: UserRole) {
  return role === "marketing";
}

export function canLogWork(role: UserRole) {
  return (
    role === "agency_manager" ||
    role === "account_manager" ||
    role === "billing" ||
    isMarketingRole(role)
  );
}

/** Roles that use the marketing employee work module (tabs, boards, charts) */
export function isEmployeeWorkRole(role: UserRole) {
  return isMarketingRole(role);
}

/** Statuses an employee may set on their own tasks (never Approved) */
export const EMPLOYEE_TASK_STATUSES = [
  "Not Started",
  "In Progress",
  "Submitted",
  "Needs Revision",
] as const;

export function canEmployeeSetTaskStatus(status: string) {
  return (EMPLOYEE_TASK_STATUSES as readonly string[]).includes(status);
}

export function canApproveTasks(role: UserRole) {
  return role === "agency_manager" || role === "account_manager";
}

export function canManageCosts(role: UserRole) {
  return (
    role === "agency_manager" ||
    role === "account_manager" ||
    isMarketingRole(role)
  );
}

export function canCreateApprovals(role: UserRole) {
  return (
    role === "agency_manager" ||
    role === "account_manager" ||
    isMarketingRole(role)
  );
}

export function canManageBilling(role: UserRole) {
  return role === "agency_manager" || role === "billing";
}

export function canRecordPayments(role: UserRole) {
  return canManageBilling(role);
}

export function canAssignTasks(role: UserRole) {
  return role === "agency_manager" || role === "account_manager";
}

export function canUseTimeTasks(role: UserRole) {
  return isEmployeeRole(role);
}

export function canViewAgencyFinance(role: UserRole) {
  return role === "agency_manager" || role === "billing";
}

export function canViewAmPortfolio(role: UserRole) {
  return role === "account_manager" || role === "agency_manager";
}

export function canViewClientProfitability(role: UserRole) {
  return (
    role === "account_manager" ||
    role === "agency_manager" ||
    role === "billing"
  );
}

export function canViewAccounting(role: UserRole) {
  return role === "agency_manager" || role === "billing";
}

export function canViewControls(role: UserRole) {
  return role === "agency_manager";
}

export function canViewMarketingMetrics(role: UserRole) {
  return role === "account_manager" || role === "agency_manager";
}

export function canViewReports(role: UserRole) {
  return (
    role === "agency_manager" ||
    role === "account_manager" ||
    role === "billing"
  );
}

export function canViewBillingPages(role: UserRole) {
  return (
    role === "agency_manager" ||
    role === "billing" ||
    role === "account_manager"
  );
}

export function canViewEmployees(role: UserRole) {
  return role === "agency_manager";
}

export function canManageBillingOps(role: UserRole) {
  return canManageBilling(role);
}
