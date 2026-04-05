const UFC_ATHLETE_BASES = ["https://www.ufc.com.br", "https://www.ufc.com"];

type FighterMediaResult = {
  slug: string;
  ufc_url: string;
  headshot_url: string;
  country: string;
  source: "ufc-athlete-page";
};

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

async function scrapeAthletePage(
  slug: string,
  base: string,
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
      signal: AbortSignal.timeout(10000),
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
): Promise<FighterMediaResult | null> {
  const slugs = generateFighterSlugCandidates(name);

  for (const slug of slugs) {
    for (const base of UFC_ATHLETE_BASES) {
      const result = await scrapeAthletePage(slug, base);
      if (result?.headshot_url) {
        return result;
      }
    }
  }

  return null;
}
