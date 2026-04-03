export const PROFILE_SELECT_FIELDS =
  "id, nickname, first_name, last_name, role, is_banned, ban_reason, total_points, created_at, updated_at";

const ALLOWED_SCRAPE_HOSTS = new Set([
  "ufc.com",
  "www.ufc.com",
  "ufc.com.br",
  "www.ufc.com.br",
  "ufcstats.com",
  "www.ufcstats.com",
  "api.the-odds-api.com",
]);

export function normalizeSafeRedirectPath(next?: string | null): string {
  if (!next) return "/home";

  try {
    if (!next.startsWith("/") || next.startsWith("//")) {
      return "/home";
    }

    const url = new URL(next, "http://localhost");
    if (url.origin !== "http://localhost") {
      return "/home";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/home";
  }
}

export function isAllowedScrapeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      ALLOWED_SCRAPE_HOSTS.has(parsed.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

export function applySecurityHeaders(headers: Headers) {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );
}
