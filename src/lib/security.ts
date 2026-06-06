export const PROFILE_SELECT_FIELDS =
  "id, nickname, first_name, last_name, role, is_banned, ban_reason, total_points, division, division_confirmed, created_at, updated_at";

const HOST_PROTOCOL_RULES: Record<string, string[]> = {
  "ufc.com": ["https:"],
  "www.ufc.com": ["https:"],
  "ufc.com.br": ["https:"],
  "www.ufc.com.br": ["https:"],
  // O UFCStats ainda expõe URLs reais em http em vários fluxos do site.
  "ufcstats.com": ["http:", "https:"],
  "www.ufcstats.com": ["http:", "https:"],
  "sherdog.com": ["https:"],
  "www.sherdog.com": ["https:"],
  "espn.com": ["https:"],
  "www.espn.com": ["https:"],
  "tapology.com": ["https:"],
  "www.tapology.com": ["https:"],
  "api.the-odds-api.com": ["https:"],
};

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
    const parsed = new URL(url.trim());
    const allowedProtocols = HOST_PROTOCOL_RULES[parsed.hostname.toLowerCase()];
    return !!allowedProtocols?.includes(parsed.protocol);
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
