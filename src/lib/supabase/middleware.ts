import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  clientNeedsForcedPasswordChange,
  isAdminOnlyAppPath,
  isClientRole,
} from "@/lib/access";
import type { UserRole } from "@/lib/types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: (() => {
        const h = new Headers(request.headers);
        h.set("x-pathname", request.nextUrl.pathname);
        return h;
      })(),
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request: {
              headers: (() => {
                const h = new Headers(request.headers);
                h.set("x-pathname", request.nextUrl.pathname);
                return h;
              })(),
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage =
    path === "/login" || path === "/signup" || path.startsWith("/auth");
  // Public marketing site and auth pages only (signing is authenticated portal).
  const isPublic = isAuthPage || path === "/";
  const isChangePasswordPath =
    path === "/app/account/change-password" ||
    path.startsWith("/app/account/change-password/");

  if (!user && !isPublic && path.startsWith("/app")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated users leave auth pages for /app; homepage stays reachable.
  if (user && (path === "/login" || path === "/signup")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, must_change_password, password_change_deferred")
      .eq("id", user.id)
      .single();

    const url = request.nextUrl.clone();
    if (profile && clientNeedsForcedPasswordChange(profile)) {
      url.pathname = "/app/account/change-password";
    } else {
      url.pathname = "/app";
    }
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith("/app")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, must_change_password, password_change_deferred")
      .eq("id", user.id)
      .single();

    const role = profile?.role as UserRole | undefined;

    if (
      profile &&
      clientNeedsForcedPasswordChange(profile) &&
      !isChangePasswordPath
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/app/account/change-password";
      return NextResponse.redirect(url);
    }

    // Clients may only access allowed portal paths — not admin routes.
    if (role && isClientRole(role) && isAdminOnlyAppPath(path)) {
      const url = request.nextUrl.clone();
      url.pathname = "/app";
      url.searchParams.set("denied", "1");
      return NextResponse.redirect(url);
    }
  }

  // Legacy temp portal routes → customer login (do not revive broader portal cookies)
  if (path.startsWith("/portal")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
