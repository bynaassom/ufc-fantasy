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

const CLEANUP_INTERVAL_MS = 5 * 60_000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanupTimer() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (now >= entry.resetAt) store.delete(key);
    });
  }, CLEANUP_INTERVAL_MS);
  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG,
): { allowed: boolean; remaining: number; resetAt: number } {
  ensureCleanupTimer();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
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
  if (STRICT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return STRICT_CONFIG;
  }
  return DEFAULT_CONFIG;
}

export function applyRateLimitHeaders(
  headers: Headers,
  result: { allowed: boolean; remaining: number; resetAt: number },
  config: RateLimitConfig = DEFAULT_CONFIG,
) {
  headers.set("X-RateLimit-Limit", String(config.maxRequests));
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
}
