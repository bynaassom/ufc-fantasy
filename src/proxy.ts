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
  "/event",
  "/ligas",
  "/historico",
  "/bate-papo",
]);

const PROTECTED_PREFIXES = [
  "/admin/",
  "/desafios/",
  "/event/",
  "/historico/",
  "/jogador/",
  "/ligas/",
  "/recap/",
];

const AUTH_ROUTES = new Set(["/login", "/register"]);

const SESSION_INDEPENDENT_PUBLIC_ROUTES = new Set([
  "/companion",
  "/privacidade",
  "/termos",
  "/auth/callback",
  "/manifest.webmanifest",
  "/offline.html",
  "/robots.txt",
  "/sitemap.xml",
  "/sw.js",
]);

const SESSION_INDEPENDENT_PUBLIC_PREFIXES = ["/companion/", "/share/"];

function matchProtectedRoute(pathname: string): boolean {
  if (PROTECTED_ROUTES.has(pathname)) return true;
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function matchAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.has(pathname);
}

function matchSessionIndependentPublicRoute(pathname: string): boolean {
  if (SESSION_INDEPENDENT_PUBLIC_ROUTES.has(pathname)) return true;
  return SESSION_INDEPENDENT_PUBLIC_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
}

function hasSupabaseSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name, value }) => {
    if (!value) return false;
    return (
      name === "supabase-auth-token" ||
      (name.startsWith("sb-") && name.includes("-auth-token"))
    );
  });
}

export async function proxy(request: NextRequest) {
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

  const protectedRoute = matchProtectedRoute(pathname);
  const hasSessionCookie = hasSupabaseSessionCookie(request);

  // Rotas comprovadamente independentes de sessão não esperam validação
  // remota, mesmo quando o navegador também possui uma sessão ativa.
  if (matchSessionIndependentPublicRoute(pathname)) {
    return supabaseResponse;
  }

  // A ausência do cookie é uma verificação otimista e barata. A validação
  // segura continua acontecendo nas páginas/serviços antes de ler dados.
  if (!hasSessionCookie) {
    if (protectedRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", normalizeSafeRedirectPath(pathname));
      const response = NextResponse.redirect(loginUrl);
      applySecurityHeaders(response.headers);
      return response;
    }

    return supabaseResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Rotas públicas continuam disponíveis durante indisponibilidade ou ausência
  // de configuração. Rotas protegidas nunca são liberadas sem autenticação.
  if (!supabaseUrl || !supabaseAnonKey) {
    if (protectedRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", normalizeSafeRedirectPath(pathname));
      const response = NextResponse.redirect(loginUrl);
      applySecurityHeaders(response.headers);
      return response;
    }

    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

  if (protectedRoute && !user) {
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
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|offline.html|robots.txt|sitemap.xml|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
