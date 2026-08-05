import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminOnlyAppPath, isClientRole } from "@/lib/access";
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
  // Public marketing site is always viewable (including when logged in).
  const isPublic = isAuthPage || path === "/";

  if (!user && !isPublic && path.startsWith("/app")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated users leave auth pages for /app; homepage stays public.
  if (user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  // Clients may only access /app (Customer Dashboard) — not admin routes.
  if (user && path.startsWith("/app") && isAdminOnlyAppPath(path)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role as UserRole | undefined;
    if (role && isClientRole(role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/app";
      url.searchParams.set("denied", "1");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
