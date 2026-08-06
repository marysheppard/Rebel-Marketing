import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  clientNeedsForcedPasswordChange,
  isAdminOnlyAppPath,
  isClientRole,
} from "@/lib/access";
import type { UserRole } from "@/lib/types";

function withPathname(request: NextRequest) {
  const h = new Headers(request.headers);
  h.set("x-pathname", request.nextUrl.pathname);
  return h;
}

function isPublicPath(path: string) {
  return (
    path === "/" ||
    path === "/login" ||
    path === "/signup" ||
    path === "/privacy" ||
    path === "/terms" ||
    path.startsWith("/auth")
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: { headers: withPathname(request) },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Missing env on Vercel would otherwise crash middleware (MIDDLEWARE_INVOCATION_FAILED).
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "[middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
    if (request.nextUrl.pathname.startsWith("/app")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request: { headers: withPathname(request) },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;
    const isPublic = isPublicPath(path);
    const isChangePasswordPath =
      path === "/app/account/change-password" ||
      path.startsWith("/app/account/change-password/");

    if (!user && !isPublic && path.startsWith("/app")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

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

      if (role && isClientRole(role) && isAdminOnlyAppPath(path)) {
        const url = request.nextUrl.clone();
        url.pathname = "/app";
        url.searchParams.set("denied", "1");
        return NextResponse.redirect(url);
      }
    }

    if (path.startsWith("/portal")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch (err) {
    console.error("[middleware] Session update failed:", err);
    // Don't take down the whole site if Auth/network fails.
    if (
      request.nextUrl.pathname.startsWith("/app") &&
      !isPublicPath(request.nextUrl.pathname)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({
      request: { headers: withPathname(request) },
    });
  }
}
