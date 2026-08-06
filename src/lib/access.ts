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
    pathname === "/app/account/change-password" ||
    pathname.startsWith("/app/account/change-password/")
  ) {
    return true;
  }
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

/** Client with a spent OTP must stay on the change-password screen. */
export function clientNeedsForcedPasswordChange(profile: {
  role: UserRole;
  must_change_password?: boolean | null;
  password_change_deferred?: boolean | null;
}) {
  return (
    isClientRole(profile.role) &&
    !!profile.must_change_password &&
    !profile.password_change_deferred
  );
}

/** True for any /app/* path that is not allowed for clients. */
export function isAdminOnlyAppPath(pathname: string) {
  if (!pathname.startsWith("/app")) return false;
  return !isClientPortalHome(pathname);
}
