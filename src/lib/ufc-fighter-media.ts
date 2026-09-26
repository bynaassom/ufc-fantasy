import { unstable_cache } from "next/cache";

const UFC_ATHLETE_BASES = ["https://www.ufc.com.br", "https://www.ufc.com"];

type FighterMediaResult = {
  slug: string;
  ufc_url: string;
  headshot_url: string;
  portrait_url: string | null;
  portrait_fallback_url: string | null;
  country: string;
  source: "ufc-athlete-page";
};

const UFC_PORTRAIT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const UFC_PORTRAIT_MISS_TTL_MS = 60 * 1000;
const UFC_PORTRAIT_CACHE_LIMIT = 500;
const UFC_PORTRAIT_MAX_IN_FLIGHT = 32;
const ufcPortraitCache = new Map<string, { expiresAt: number; value: { imageUrl: string | null; fallbackUrl: string | null } }>();
const ufcPortraitInFlight = new Map<string, Promise<{ imageUrl: string | null; fallbackUrl: string | null }>>();

export class UfcPortraitLookupSaturatedError extends Error {
  constructor() {
    super("UFC portrait lookup capacity reached");
    this.name = "UfcPortraitLookupSaturatedError";
  }
}

export function canonicalizeFighterName(name: string) {
  return name.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ");
}

export function isValidUfcAthleteSlug(slug: string) {
  return slug.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+){0,15}$/i.test(slug) && !slug.includes("..") && !slug.includes("/");
}

function extractOfficialPortrait(html: string, base: string) {
  // Only trust the athlete hero profile image. Generic page images include
  // opponent cards, banners, and social previews with very different crops.
  const tags = html.match(/<img\b[^>]*(?:class|\s)=["'][^"']*hero-profile__image[^"']*["'][^>]*>/gi) || [];
  for (const tag of tags) {
    const raw = tag.match(/(?:src|data-src)=["']([^"']+)["']/i)?.[1];
    if (!raw) continue;
    const fallbackUrl = absolutizeUfcUrl(decodeEscapedUrl(raw), base);
    let parsed: URL;
    try { parsed = new URL(fallbackUrl); } catch { continue; }
    const officialHost = parsed.hostname === "ufc.com" || parsed.hostname.endsWith(".ufc.com") || parsed.hostname === "ufc.com.br" || parsed.hostname.endsWith(".ufc.com.br");
    if (parsed.protocol !== "https:" || !officialHost) continue;
    const path = parsed.pathname;
    if (!path.includes("/styles/athlete_bio_full_body/") || /placeholder|silhouette|default|no[-_]?image/i.test(path)) continue;
    const originalPath = path.replace("/images/styles/athlete_bio_full_body/s3/", "/images/");
    if (originalPath === path || originalPath.includes("/styles/")) continue;
    return { imageUrl: `https://ufc.com${originalPath}`, fallbackUrl };
  }
  return { imageUrl: null, fallbackUrl: null };
}

export async function getCachedUfcFighterPortrait(name: string, slug?: string) {
  const canonicalSlug = slug?.toLowerCase() ?? "";
  const key = `${canonicalizeFighterName(name)}:${canonicalSlug}`;
  const cached = ufcPortraitCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    ufcPortraitCache.delete(key);
    ufcPortraitCache.set(key, cached);
    return cached.value;
  }
  if (cached) ufcPortraitCache.delete(key);
  const existingRequest = ufcPortraitInFlight.get(key);
  if (existingRequest) return existingRequest;
  if (ufcPortraitInFlight.size >= UFC_PORTRAIT_MAX_IN_FLIGHT) {
    throw new UfcPortraitLookupSaturatedError();
  }

  const request = (async () => {
    // Portrait calls must continue to the next official locale if a page has
    // regular metadata/headshots but no athlete hero portrait.
    const media = await resolveUfcFighterMedia(name, 10_000, slug, true);
    const identityMatches = !slug || media?.slug.toLowerCase() === canonicalSlug;
    const selected = identityMatches ? media : null;
    const value = { imageUrl: selected?.portrait_url ?? null, fallbackUrl: selected?.portrait_fallback_url ?? null };
    // Expired entries are removed first; insertion order then gives LRU-style eviction.
    const now = Date.now();
    for (const [cacheKey, entry] of ufcPortraitCache) {
      if (entry.expiresAt <= now) ufcPortraitCache.delete(cacheKey);
    }
    while (ufcPortraitCache.size >= UFC_PORTRAIT_CACHE_LIMIT) {
      const oldestKey = ufcPortraitCache.keys().next().value;
      if (oldestKey === undefined) break;
      ufcPortraitCache.delete(oldestKey);
    }
    ufcPortraitCache.set(key, { value, expiresAt: now + (value.imageUrl ? UFC_PORTRAIT_CACHE_TTL_MS : UFC_PORTRAIT_MISS_TTL_MS) });
    return value;
  })();
  ufcPortraitInFlight.set(key, request);
  try {
    return await request;
  } finally {
    ufcPortraitInFlight.delete(key);
  }
}

export function isUsableHeadshotUrl(value?: string | null) {
  if (!value) return false;
  const normalized = value.trim();
  if (!normalized) return false;
  if (normalized === "width=" || normalized === "height=") return false;
  if (normalized.includes("width=") && !normalized.startsWith("http")) return false;
  return /^https?:\/\/.+\.(png|webp|jpg|jpeg)(\?.*)?$/i.test(normalized);
}

export function getUfcHeadshotQualityScore(value?: string | null) {
  if (!isUsableHeadshotUrl(value)) return -1;

  try {
    const url = new URL(value!.trim());
    const path = url.pathname.toLowerCase();
    const isUfcMedia = url.hostname === "ufc.com" || url.hostname.endsWith(".ufc.com");

    if (!isUfcMedia) return 50;
    if (path.includes("/styles/event_fight_card_upper_body")) return 20;
    if (path.includes("/styles/athlete_splash/")) return 60;
    if (path.includes("/styles/athlete_bio_full_body/")) return 70;
    if (path.includes("/styles/event_results_athlete_headshot/")) return 80;
    if (path.includes("/styles/inline/")) return 90;
    if (path.includes("/images/") && !path.includes("/images/styles/")) return 100;
    return 50;
  } catch {
    return -1;
  }
}

export function isLowQualityHeadshotUrl(value?: string | null) {
  const score = getUfcHeadshotQualityScore(value);
  return score >= 0 && score <= 20;
}

export function selectPreferredHeadshotUrl(
  ...values: Array<string | null | undefined>
) {
  let preferred = "";
  let preferredScore = -1;

  for (const value of values) {
    const score = getUfcHeadshotQualityScore(value);
    if (score > preferredScore) {
      preferred = value?.trim() || "";
      preferredScore = score;
    }
  }

  return preferred;
}

export function isLikelyMismatchedUfcHeadshot(
  value: string | null | undefined,
  fighterName: string,
) {
  if (!isUsableHeadshotUrl(value)) return false;

  try {
    const url = new URL(value!.trim());
    if (url.hostname !== "ufc.com" && !url.hostname.endsWith(".ufc.com")) {
      return false;
    }

    const filename = decodeURIComponent(url.pathname.split("/").pop() || "")
      .replace(/\.(png|webp|jpg|jpeg)$/i, "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-");
    const nameTokens = fighterName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3);

    return nameTokens.length > 0 && !nameTokens.some((token) => filename.includes(token));
  } catch {
    return false;
  }
}

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function decodeEscapedUrl(value: string) {
  return value
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/\u002F/g, "/");
}

function absolutizeUfcUrl(url: string, base: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

function extractCountry(html: string) {
  const patterns = [
    /"nationality"\s*:\s*"([^"]+)"/i,
    /"country"\s*:\s*"([^"]+)"/i,
    /class="[^"]*nationality[^"]*"[^>]*>\s*<[^>]+>\s*([^<]+)/i,
    /Nacionalidade[^<]*<\/[^>]+>\s*<[^>]+>\s*([^<\n]+)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  return "";
}

function extractHeadshotUrl(html: string, base: string) {
  const patterns = [
    /property="og:image"\s+content="([^"]+)"/i,
    /<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i,
    /"full_body_image_url_desktop":"([^"]+)"/i,
    /"full_body_image_url_mobile":"([^"]+)"/i,
    /"profile_image":"([^"]+)"/i,
    /"hero_image":"([^"]+)"/i,
    /"image_url":"([^"]+)"/i,
    /(https?:\/\/[^\s"'\\]+(?:athlete_bio_full_body|athlete_splash|event_fight_card_upper_body)[^"'\s\\>]+?\.(?:png|webp|jpg|jpeg))/i,
    /(\/images\/styles\/(?:athlete_bio_full_body|athlete_splash|event_fight_card_upper_body)[^"'\s>]+?\.(?:png|webp|jpg|jpeg))/i,
  ];

  const candidates: string[] = [];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      candidates.push(absolutizeUfcUrl(decodeEscapedUrl(match[1]), base));
    }
  }

  const normalized = candidates
    .map((candidate) => candidate.trim())
    .filter(Boolean);

  return selectPreferredHeadshotUrl(...normalized);
}

function extractHeadshotCandidates(htmlBlock: string, base: string) {
  const candidates: string[] = [];
  const imageTagRegex = /<(?:img|source)\b[^>]*>/gi;

  let imageTagMatch;
  while ((imageTagMatch = imageTagRegex.exec(htmlBlock)) !== null) {
    const tag = imageTagMatch[0];
    if (!/(?:event_fight_card_upper_body|athlete_bio_full_body|athlete_splash)/i.test(tag)) {
      continue;
    }

    const rawAttribute = tag.match(/(?:src|data-src|srcset)\s*=\s*["']([^"']+)["']/i)?.[1];
    const raw = rawAttribute?.split(",")[0]?.trim().split(" ")[0]?.trim();
    const normalized = absolutizeUfcUrl(decodeEscapedUrl(raw || ""), base);
    if (isUsableHeadshotUrl(normalized)) {
      candidates.push(normalized);
    }
  }

  const genericRegex =
    /(https?:\/\/[^\s"'\\]+(?:event_fight_card_upper_body|athlete_bio_full_body|athlete_splash)[^"'\s\\>]+?\.(?:png|webp|jpg|jpeg)|\/images\/styles\/(?:event_fight_card_upper_body|athlete_bio_full_body|athlete_splash)[^"'\s>]+?\.(?:png|webp|jpg|jpeg))/gi;

  let genericMatch;
  while ((genericMatch = genericRegex.exec(htmlBlock)) !== null) {
    const normalized = absolutizeUfcUrl(
      decodeEscapedUrl(genericMatch[1] || ""),
      base,
    );
    if (isUsableHeadshotUrl(normalized)) {
      candidates.push(normalized);
    }
  }

  return unique(candidates);
}

function extractCornerSection(htmlBlock: string, corner: "red" | "blue") {
  const marker = `c-listing-fight__corner-image--${corner}`;
  const start = htmlBlock.indexOf(marker);
  if (start < 0) return null;

  const endMarkers = corner === "red"
    ? ["c-listing-fight__details", "c-listing-fight__corner-image--blue"]
    : ["c-listing-fight__details-content", "c-listing-fight__odds-row"];
  const ends = endMarkers
    .map((endMarker) => htmlBlock.indexOf(endMarker, start + marker.length))
    .filter((position) => position >= 0);
  const end = ends.length > 0 ? Math.min(...ends) : htmlBlock.length;

  return htmlBlock.slice(start, end);
}

export function extractEventCardHeadshots(
  htmlBlock: string,
  base: string,
): [string, string] {
  const redSection = extractCornerSection(htmlBlock, "red");
  const blueSection = extractCornerSection(htmlBlock, "blue");

  if (redSection !== null || blueSection !== null) {
    return [
      redSection ? extractHeadshotCandidates(redSection, base)[0] || "" : "",
      blueSection ? extractHeadshotCandidates(blueSection, base)[0] || "" : "",
    ];
  }

  const legacyCandidates = extractHeadshotCandidates(htmlBlock, base);
  return legacyCandidates.length >= 2
    ? [legacyCandidates[0], legacyCandidates[1]]
    : ["", ""];
}

async function scrapeAthletePage(
  slug: string,
  base: string,
  timeoutMs: number,
): Promise<FighterMediaResult | null> {
  const ufcUrl = `${base}/athlete/${slug}`;

  try {
    const response = await fetch(ufcUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        Referer: `${base}/`,
      },
      signal: AbortSignal.timeout(Math.max(1, timeoutMs)),
      cache: "no-store",
    });

    if (!response.ok) return null;
    const html = await response.text();
    const headshotUrl = extractHeadshotUrl(html, base);
    if (!headshotUrl) return null;
    const portrait = extractOfficialPortrait(html, base);

    return {
      slug,
      ufc_url: ufcUrl,
      headshot_url: headshotUrl,
      portrait_url: portrait.imageUrl,
      portrait_fallback_url: portrait.fallbackUrl,
      country: extractCountry(html),
      source: "ufc-athlete-page",
    };
  } catch {
    return null;
  }
}

export function generateFighterSlugCandidates(name: string) {
  const base = toSlug(name);
  const parts = base.split("-").filter(Boolean);
  const particles = new Set([
    "da",
    "de",
    "do",
    "das",
    "dos",
    "del",
    "della",
    "di",
    "du",
    "la",
    "le",
    "van",
    "von",
    "al",
    "el",
  ]);

  const candidates = [base];
  const cleaned = base.replace(/-jr$|-sr$|-ii$|-iii$|-iv$/i, "");
  if (cleaned && cleaned !== base) candidates.push(cleaned);

  if (parts.length >= 2) {
    candidates.push(`${parts[0]}-${parts[parts.length - 1]}`);
    candidates.push(`${parts[parts.length - 1]}-${parts[0]}`);
  }

  const withoutParticles = parts.filter((part) => !particles.has(part));
  if (withoutParticles.length >= 2) {
    candidates.push(withoutParticles.join("-"));
    candidates.push(`${withoutParticles[0]}-${withoutParticles[withoutParticles.length - 1]}`);
    candidates.push(`${withoutParticles[withoutParticles.length - 1]}-${withoutParticles[0]}`);
  }

  if (parts.length >= 3) {
    candidates.push(`${parts[0]}-${parts[1]}-${parts[parts.length - 1]}`);
    candidates.push(`${parts[0]}-${parts[parts.length - 2]}-${parts[parts.length - 1]}`);
  }

  return unique(candidates.filter(Boolean));
}

export async function resolveUfcFighterMedia(
  name: string,
  totalTimeoutMs = 10_000,
  preferredSlug?: string,
  requirePortrait = false,
): Promise<FighterMediaResult | null> {
  if (preferredSlug && !isValidUfcAthleteSlug(preferredSlug)) return null;
  const slugs = unique([
    ...(preferredSlug ? [preferredSlug] : []),
    ...generateFighterSlugCandidates(name),
  ]);
  const deadline = Date.now() + Math.max(1, totalTimeoutMs);

  for (const slug of slugs) {
    for (const base of UFC_ATHLETE_BASES) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) return null;
      const result = await scrapeAthletePage(slug, base, Math.min(10_000, remainingMs));
      if (result?.headshot_url && (!requirePortrait || result.portrait_url)) {
        return result;
      }
    }
  }

  return null;
}

export function getCachedUfcFighterMedia(name: string, totalTimeoutMs = 10_000) {
  return unstable_cache(
    () => resolveUfcFighterMedia(name, totalTimeoutMs),
    ["ufc-fighter-media", name],
    { revalidate: 21_600 },
  )();
}
