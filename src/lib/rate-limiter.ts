const store = new Map<string, { count: number; resetAt: number }>();

const ONE_MINUTE_MS = 60_000;

export type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 60,
  windowMs: ONE_MINUTE_MS,
};

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG,
): { allowed: boolean; remaining: number; resetAt: number; limit: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs, limit: config.maxRequests };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, limit: config.maxRequests };
  }

  entry.count += 1;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt, limit: config.maxRequests };
}

export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const path = new URL(request.url).pathname;
  return `${ip}:${path}`;
}

const STRICT_CONFIG: RateLimitConfig = {
  maxRequests: 20,
  windowMs: ONE_MINUTE_MS,
};

const STRICT_PREFIXES = ["/api/challenges", "/api/picks"];

export function getRateLimitConfig(pathname: string): RateLimitConfig {
  if (
    STRICT_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    /^\/api\/events\/[^/]+\/picks(?:\/|$)/.test(pathname)
  ) {
    return STRICT_CONFIG;
  }
  return DEFAULT_CONFIG;
}

export function applyRateLimitHeaders(
  headers: Headers,
  result: { allowed: boolean; remaining: number; resetAt: number; limit: number },
) {
  headers.set("X-RateLimit-Limit", String(result.limit));
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
}
