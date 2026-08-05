import type { UserRole } from "@/lib/types";

export function isClientRole(role: UserRole) {
  return role === "client";
}

export function isEmployeeRole(role: UserRole) {
  return !isClientRole(role);
}

/** Paths the client portal may visit (dashboard + in-app contract signing). */
export function isClientPortalHome(pathname: string) {
  if (pathname === "/app" || pathname === "/app/") return true;
  if (
    pathname === "/app/contracts/documents" ||
    pathname.startsWith("/app/contracts/documents/")
  ) {
    return true;
  }
  // /app/contracts/:id/sign
  if (/^\/app\/contracts\/[^/]+\/sign\/?$/.test(pathname)) return true;
  // /app/contracts/:id (detail view) — not the agency list at /app/contracts
  if (
    pathname !== "/app/contracts" &&
    /^\/app\/contracts\/[^/]+\/?$/.test(pathname)
  ) {
    return true;
  }
  return false;
}

/** True for any /app/* path that is not allowed for clients. */
export function isAdminOnlyAppPath(pathname: string) {
  if (!pathname.startsWith("/app")) return false;
  return !isClientPortalHome(pathname);
}
