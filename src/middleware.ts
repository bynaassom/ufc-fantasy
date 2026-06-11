import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { applySecurityHeaders } from "@/lib/security";
import {
  checkRateLimit,
  getRateLimitKey,
  getRateLimitConfig,
  applyRateLimitHeaders,
} from "@/lib/rate-limiter";
import { normalizeSafeRedirectPath } from "@/lib/security";

const PROTECTED_ROUTES = new Set([
  "/home",
  "/ranking",
  "/admin",
  "/profile",
  "/desafios",
]);

const PROTECTED_PREFIXES = ["/event/", "/jogador/"];

const AUTH_ROUTES = new Set(["/login", "/register"]);

function matchProtectedRoute(pathname: string): boolean {
  if (PROTECTED_ROUTES.has(pathname)) return true;
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function matchAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.has(pathname);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/")) {
    const key = getRateLimitKey(request);
    const config = getRateLimitConfig(pathname);
    const result = checkRateLimit(key, config);
    const response = result.allowed
      ? NextResponse.next({ request })
      : NextResponse.json(
          { ok: false, error: { code: "RATE_LIMITED", message: "Muitas requisições. Tente novamente em instantes." } },
          { status: 429 },
        );
    applySecurityHeaders(response.headers);
    applyRateLimitHeaders(response.headers, result);
    return response;
  }

  let supabaseResponse = NextResponse.next({ request });
  applySecurityHeaders(supabaseResponse.headers);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              options as Parameters<typeof supabaseResponse.cookies.set>[2],
            ),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname === "/" && user) {
    const response = NextResponse.redirect(new URL("/home", request.url));
    applySecurityHeaders(response.headers);
    return response;
  }

  if (matchProtectedRoute(pathname) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", normalizeSafeRedirectPath(pathname));
    const response = NextResponse.redirect(loginUrl);
    applySecurityHeaders(response.headers);
    return response;
  }

  if (matchAuthRoute(pathname) && user) {
    const response = NextResponse.redirect(new URL("/home", request.url));
    applySecurityHeaders(response.headers);
    return response;
  }

  // Admin protection
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!user) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      applySecurityHeaders(response.headers);
      return response;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_banned")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin" || profile.is_banned) {
      const response = NextResponse.redirect(new URL("/home", request.url));
      applySecurityHeaders(response.headers);
      return response;
    }
  }

  applySecurityHeaders(supabaseResponse.headers);
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
