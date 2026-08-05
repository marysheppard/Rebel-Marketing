import type { UserRole } from "@/lib/types";

export function isClientRole(role: UserRole) {
  return role === "client";
}

export function isEmployeeRole(role: UserRole) {
  return !isClientRole(role);
}

/** Client portal home — the only /app path clients may visit. */
export function isClientPortalHome(pathname: string) {
  return pathname === "/app" || pathname === "/app/";
}

/** True for any /app/* path that is not the client portal home. */
export function isAdminOnlyAppPath(pathname: string) {
  if (!pathname.startsWith("/app")) return false;
  return !isClientPortalHome(pathname);
}
