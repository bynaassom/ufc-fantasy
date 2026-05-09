import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { applySecurityHeaders } from "@/lib/security";

export async function middleware(request: NextRequest) {
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

  const pathname = request.nextUrl.pathname;

  // Protected routes
  const protectedRoutes = [
    "/home",
    "/event",
    "/ranking",
    "/admin",
    "/profile",
    "/desafios",
    "/jogador",
  ];
  const authRoutes = ["/login", "/register"];

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r));

  if (pathname === "/" && user) {
    const response = NextResponse.redirect(new URL("/home", request.url));
    applySecurityHeaders(response.headers);
    return response;
  }

  if (isProtected && !user) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    applySecurityHeaders(response.headers);
    return response;
  }

  if (isAuthRoute && user) {
    const response = NextResponse.redirect(new URL("/home", request.url));
    applySecurityHeaders(response.headers);
    return response;
  }

  // Admin protection
  if (pathname.startsWith("/admin") && user) {
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
