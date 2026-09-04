import { unstable_cache } from "next/cache";

const UFC_ATHLETE_BASES = ["https://www.ufc.com.br", "https://www.ufc.com"];

type FighterMediaResult = {
  slug: string;
  ufc_url: string;
  headshot_url: string;
  country: string;
  source: "ufc-athlete-page";
};

export function isUsableHeadshotUrl(value?: string | null) {
  if (!value) return false;
  const normalized = value.trim();
  if (!normalized) return false;
  if (normalized === "width=" || normalized === "height=") return false;
  if (normalized.includes("width=") && !normalized.startsWith("http")) return false;
  return /^https?:\/\/.+\.(png|webp|jpg|jpeg)(\?.*)?$/i.test(normalized);
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

  const ranked = normalized.sort((left, right) => {
    const score = (value: string) => {
      let total = 0;
      if (value.includes("athlete_bio_full_body")) total += 4;
      if (value.includes("athlete_splash")) total += 3;
      if (value.includes("event_fight_card_upper_body")) total += 2;
      if (/\.(png|webp|jpg|jpeg)(\?|$)/i.test(value)) total += 1;
      return total;
    };

    return score(right) - score(left);
  });

  return ranked[0] || "";
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

    return {
      slug,
      ufc_url: ufcUrl,
      headshot_url: headshotUrl,
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
): Promise<FighterMediaResult | null> {
  const slugs = generateFighterSlugCandidates(name);
  const deadline = Date.now() + Math.max(1, totalTimeoutMs);

  for (const slug of slugs) {
    for (const base of UFC_ATHLETE_BASES) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) return null;
      const result = await scrapeAthletePage(slug, base, Math.min(10_000, remainingMs));
      if (result?.headshot_url) {
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
