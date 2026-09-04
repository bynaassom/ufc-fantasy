import { isAllowedScrapeUrl } from "@/lib/security";
import { fetchUpcomingUFCEventsFromPage } from "@/lib/ufc-api";
import {
  extractUfcLiveEventId,
  fetchUfcLiveEvent,
  type UfcLiveCardFight,
} from "@/lib/ufc-live-api";
import { namesMatch } from "@/lib/ufc-results-sync";
import {
  extractEventCardHeadshots,
  isUsableHeadshotUrl,
  resolveUfcFighterMedia,
} from "@/lib/ufc-fighter-media";
import { extractWeightClassFromHtmlBlock } from "@/lib/ufc-weight";

const UFC_SITE_BASE = "https://www.ufc.com.br";

const FLAG_COUNTRY: Record<string, string> = {
  RU: "Rússia",
  EN: "Inglaterra",
  US: "Estados Unidos",
  BR: "Brasil",
  PL: "Polônia",
  GE: "Geórgia",
  AU: "Austrália",
  LT: "Lituânia",
  PT: "Portugal",
  PS: "Palestina",
  WL: "País de Gales",
  FR: "França",
  BE: "Bélgica",
  IR: "Irã",
  MX: "México",
  CA: "Canadá",
  GB: "Reino Unido",
  NZ: "Nova Zelândia",
  KZ: "Cazaquistão",
  KG: "Quirguistão",
  AZ: "Azerbaijão",
  UA: "Ucrânia",
  NG: "Nigéria",
  CN: "China",
  JP: "Japão",
  KR: "Coreia do Sul",
  SE: "Suécia",
  NO: "Noruega",
  NL: "Holanda",
  DE: "Alemanha",
  IT: "Itália",
  ES: "Espanha",
  CL: "Chile",
  AR: "Argentina",
  CO: "Colômbia",
  VE: "Venezuela",
  CH: "Suíça",
  TR: "Turquia",
};

export type ScrapedCardFight = {
  fmid: string;
  card_type: "main" | "preliminary";
  fight_order: number;
  weight_class: string;
  is_title_fight: boolean;
  total_rounds: number;
  ufc_matchup_url: string;
  fighter_a: { name: string; country: string; headshot_url: string };
  fighter_b: { name: string; country: string; headshot_url: string };
};

type ExistingFightLike = {
  id: string;
  created_at?: string | null;
  weight_class?: string | null;
  card_type?: string | null;
  fight_order?: number | null;
  is_title_fight?: boolean | null;
  total_rounds?: number | null;
  result_confirmed?: boolean | null;
  ufc_matchup_url?: string | null;
  fighter_a?: { name?: string | null } | Array<{ name?: string | null }> | null;
  fighter_b?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

type FightChanges = Record<string, { from: unknown; to: unknown }>;

type ListingFightPosition = {
  fmid: string;
  pos: number;
};

type ParsedAthlete = {
  slug: string;
  name: string;
};

type SearchNewsResult = {
  title: string;
  teaser: string;
  url: string;
};

export type ScrapedCardDiff = {
  added: ScrapedCardFight[];
  duplicates: ExistingFightLike[];
  removed: ExistingFightLike[];
  updated: Array<{
    db_id: string;
    changes: FightChanges;
    fight: ScrapedCardFight;
    existingFight: ExistingFightLike;
  }>;
  unchanged_count: number;
};

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripTags(value: string) {
  return decodeHtml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizePersonName(value: string) {
  return decodeHtml(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’.]/g, "")
    .replace(/[^a-z\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getFightPairKey(nameA: string, nameB: string) {
  return [normalizePersonName(nameA), normalizePersonName(nameB)].sort().join("::");
}

function stripNicknames(value: string) {
  return value.replace(/["“”][^"“”]+["“”]/g, " ").replace(/\s+/g, " ").trim();
}

function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function absolutizeUfcEventUrl(pathOrUrl: string) {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  return `${UFC_SITE_BASE}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

function getAthleteSlugFromHref(href?: string | null) {
  if (!href) return "";
  return href.match(/\/athlete\/([a-z0-9-]+)/i)?.[1]?.toLowerCase() || "";
}

function getEventSlugFromUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) return "";

  try {
    const parsed = new URL(absolutizeUfcEventUrl(pathOrUrl));
    return parsed.pathname.match(/\/event\/([^/?#]+)/i)?.[1]?.toLowerCase() || "";
  } catch {
    return "";
  }
}

function getDateKey(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function getEventMatchupKey(name?: string | null) {
  if (!name) return "";

  const normalized = stripTags(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bversus\b/g, "vs")
    .replace(/\bx\b/g, "vs")
    .replace(/\s+/g, " ")
    .trim();

  const parts = normalized
    .split(/[:|]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const candidate = parts.length > 1 ? parts[parts.length - 1] : normalized;

  return candidate
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildEventUrlCandidates(event: {
  slug?: string | null;
  name?: string | null;
  ufc_event_id?: string | null;
}) {
  const candidates = new Set<string>();

  if (event.ufc_event_id && /\/event\//i.test(event.ufc_event_id)) {
    candidates.add(absolutizeUfcEventUrl(event.ufc_event_id));
  }

  if (event.slug) {
    candidates.add(absolutizeUfcEventUrl(`/event/${event.slug}`));
    const numberedSlug = event.slug.match(/^(ufc-\d+)\b/i)?.[1];
    if (numberedSlug) {
      candidates.add(absolutizeUfcEventUrl(`/event/${numberedSlug.toLowerCase()}`));
    }
  }

  if (event.name) {
    const numberedName = event.name.match(/^UFC\s+(\d+)\b/i)?.[1];
    if (numberedName) {
      candidates.add(absolutizeUfcEventUrl(`/event/ufc-${numberedName}`));
    }
  }

  return Array.from(candidates).filter(Boolean);
}

export async function resolveEventUrlCandidates(event: {
  slug?: string | null;
  name?: string | null;
  event_date?: string | null;
  ufc_event_id?: string | null;
}) {
  const candidates = new Set(buildEventUrlCandidates(event));
  const currentSlug = (event.slug || "").toLowerCase();
  const currentDateKey = getDateKey(event.event_date);
  const currentMatchupKey = getEventMatchupKey(event.name);
  const currentPathSlug = getEventSlugFromUrl(event.ufc_event_id);

  try {
    const pageEvents = await fetchUpcomingUFCEventsFromPage(20, true);
    const sameDateMatches = pageEvents.filter(
      (pageEvent) => getDateKey(pageEvent.date) === currentDateKey,
    );

    for (const pageEvent of pageEvents) {
      const pageSlug = getEventSlugFromUrl(pageEvent.eventUrl || pageEvent.id);
      const pageMatchupKey = getEventMatchupKey(pageEvent.name);
      const pageDateKey = getDateKey(pageEvent.date);

      const slugMatches =
        !!pageSlug &&
        !!currentSlug &&
        (pageSlug === currentSlug ||
          pageSlug.endsWith(currentSlug) ||
          currentSlug.endsWith(pageSlug));

      const pathMatches =
        !!pageSlug &&
        !!currentPathSlug &&
        (pageSlug === currentPathSlug ||
          pageSlug.endsWith(currentPathSlug) ||
          currentPathSlug.endsWith(pageSlug));

      const matchupMatches =
        !!currentMatchupKey &&
        !!pageMatchupKey &&
        pageMatchupKey === currentMatchupKey;

      const dateMatches = !!currentDateKey && pageDateKey === currentDateKey;
      const onlyEventOnSameDate = sameDateMatches.length === 1 && dateMatches;

      if (slugMatches || pathMatches || (dateMatches && matchupMatches) || onlyEventOnSameDate) {
        if (pageEvent.eventUrl) candidates.add(pageEvent.eventUrl);
        if (pageEvent.id && /\/event\//i.test(pageEvent.id)) {
          candidates.add(absolutizeUfcEventUrl(pageEvent.id));
        }
      }
    }
  } catch {
    // Mantém apenas os candidatos locais quando a página de eventos estiver indisponível.
  }

  return Array.from(candidates).filter(Boolean);
}

function getListingFightPositions(html: string): ListingFightPosition[] {
  const listingMatches = Array.from(
    html.matchAll(/<div class="c-listing-fight" data-fmid="(\d+)"/g),
  ).map((match) => ({
    fmid: match[1],
    pos: match.index ?? 0,
  }));

  if (listingMatches.length > 0) {
    return listingMatches;
  }

  const seenFmids = new Set<string>();
  const fallbackMatches: ListingFightPosition[] = [];

  for (const match of Array.from(html.matchAll(/data-fmid="(\d+)"/g))) {
    const fmid = match[1];
    if (seenFmids.has(fmid)) continue;
    seenFmids.add(fmid);
    fallbackMatches.push({
      fmid,
      pos: match.index ?? 0,
    });
  }

  return fallbackMatches;
}

function getBlockEnd(
  currentPos: number,
  nextPos: number | undefined,
  htmlLength: number,
  sectionBoundaries: number[],
) {
  const endCandidates = [
    nextPos ?? htmlLength,
    ...sectionBoundaries.filter((boundary) => boundary > currentPos),
    htmlLength,
  ];

  return Math.min(...endCandidates);
}

function getCardTypeForPosition(
  pos: number,
  mainPos: number,
  prelimPos: number,
  earlyPos: number,
): "main" | "preliminary" {
  if (mainPos < 0 || pos <= mainPos) return "preliminary";
  if (prelimPos >= 0 && pos >= prelimPos) return "preliminary";
  if (earlyPos >= 0 && pos >= earlyPos) return "preliminary";
  return "main";
}

function extractAthleteSlugs(block: string) {
  const seenSlugs = new Set<string>();
  const slugs: string[] = [];

  for (const match of Array.from(block.matchAll(/\/athlete\/([a-z0-9-]+)/gi))) {
    const slug = match[1].toLowerCase();
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    slugs.push(slug);
    if (slugs.length === 2) break;
  }

  return slugs;
}

function extractAthletesFromCorners(block: string): ParsedAthlete[] {
  const athletes: ParsedAthlete[] = [];

  for (const match of Array.from(
    block.matchAll(
      /c-listing-fight__corner-name--(?:red|blue)[\s\S]*?<a[^>]*(?:href="([^"]*)")?[^>]*>([\s\S]*?)<\/a>/gi,
    ),
  )) {
    const slug = getAthleteSlugFromHref(match[1]);
    const name = stripTags(match[2]) || (slug ? slugToName(slug) : "");
    if (!name) continue;
    if (!athletes.some((athlete) => athlete.name === name)) {
      athletes.push({ slug, name });
    }
    if (athletes.length === 2) {
      return athletes;
    }
  }

  return athletes;
}

function extractAthletesFromDetails(block: string): ParsedAthlete[] {
  const names = Array.from(
    block.matchAll(/details-content__name--(?:red|blue)[^>]*>([\s\S]*?)<\/div>/gi),
  )
    .map((match) => stripTags(match[1]))
    .filter(Boolean);

  if (names.length < 2) {
    return [];
  }

  return names.slice(0, 2).map((name) => ({
    slug: "",
    name,
  }));
}

function extractAthletesFromAnchors(block: string, slugs: string[]): ParsedAthlete[] {
  return slugs.slice(0, 2).map((slug) => {
    const anchorMatch = block.match(
      new RegExp(`href="[^"]*${slug}[^"]*"[^>]*>([\\s\\S]*?)<\\/a>`, "i"),
    );

    return {
      slug,
      name: anchorMatch ? stripTags(anchorMatch[1]) || slugToName(slug) : slugToName(slug),
    };
  });
}

function extractFightAthletes(block: string): ParsedAthlete[] {
  const fromCorners = extractAthletesFromCorners(block);
  if (fromCorners.length === 2) {
    return fromCorners;
  }

  const fromDetails = extractAthletesFromDetails(block);
  if (fromDetails.length === 2) {
    return fromDetails;
  }

  const slugs = extractAthleteSlugs(block);
  if (slugs.length < 2) {
    return [];
  }

  return extractAthletesFromAnchors(block, slugs);
}

function extractCountryNames(block: string) {
  const extractCornerCountry = (corner: "red" | "blue") => {
    const marker = `c-listing-fight__country--${corner}`;
    const start = block.indexOf(marker);
    if (start < 0) return null;

    const endMarker = corner === "red"
      ? "c-listing-fight__country--blue"
      : "c-listing-fight__results--mobile";
    const next = block.indexOf(endMarker, start + marker.length);
    const section = block.slice(start, next >= 0 ? next : block.length);
    const text = section.match(/c-listing-fight__country-text"[^>]*>([\s\S]*?)<\/div>/i);
    const countryText = stripTags(text?.[1] || "");
    if (countryText) return countryText;

    const flagCode = section.match(/\/flags\/([A-Z]{2})\.PNG/i)?.[1]?.toUpperCase();
    return flagCode ? FLAG_COUNTRY[flagCode] || "" : "";
  };

  const redCountry = extractCornerCountry("red");
  const blueCountry = extractCornerCountry("blue");
  if (redCountry !== null || blueCountry !== null) {
    return [redCountry || "", blueCountry || ""];
  }

  const countryTexts = Array.from(
    block.matchAll(/c-listing-fight__country-text"[^>]*>([\s\S]*?)<\/div>/gi),
  )
    .map((match) => stripTags(match[1]));

  if (countryTexts.length >= 2) {
    return countryTexts.slice(0, 2);
  }

  const countries: string[] = [];
  for (const match of Array.from(block.matchAll(/\/flags\/([A-Z]{2})\.PNG/gi))) {
    countries.push(FLAG_COUNTRY[match[1].toUpperCase()] || "");
    if (countries.length === 2) {
      break;
    }
  }

  return countries;
}

function parseEventTitleFromHtml(html: string) {
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  return title ? stripTags(title).replace(/\s*\|\s*UFC.*$/i, "").trim() : "";
}

export function parseUfcSearchNewsResults(html: string): SearchNewsResult[] {
  const results: SearchNewsResult[] = [];

  for (const match of Array.from(
    html.matchAll(
      /<a[^>]+class="c-card--grid-card-trending[^"]*"[^>]+href="([^"]*\/news\/[^"]+)"[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>(?:[\s\S]*?<div class="field field--name-teaser[\s\S]*?<p>([\s\S]*?)<\/p>)?/gi,
    ),
  )) {
    const url = absolutizeUfcEventUrl(match[1]);
    const title = stripTags(match[2]);
    const teaser = stripTags(match[3] || "");

    if (!title || !url) continue;
    if (results.some((result) => result.url === url)) continue;

    results.push({ url, title, teaser });
  }

  return results;
}

export function extractExcludedFightPairKeysFromNewsResults(results: SearchNewsResult[]) {
  const excludedPairs = new Set<string>();

  for (const result of results) {
    const haystack = `${result.title} ${result.teaser}`.trim();
    if (!/(atualiza|update|mudan[cç]a)/i.test(haystack)) continue;
    if (!/(transferid|removid|fora do card|retirad|cancelad|adiad|moveu|moved)/i.test(haystack)) {
      continue;
    }

    for (const pairMatch of Array.from(
      haystack.matchAll(
        /([A-ZÀ-ÿ][A-Za-zÀ-ÿ'".-]+(?:\s+[A-ZÀ-ÿ][A-Za-zÀ-ÿ'".-]+)+)\s+(?:x|vs\.?)\s+([A-ZÀ-ÿ][A-Za-zÀ-ÿ'".-]+(?:\s+[A-ZÀ-ÿ][A-Za-zÀ-ÿ'".-]+)+)/g,
      ),
    )) {
      excludedPairs.add(getFightPairKey(stripNicknames(pairMatch[1]), stripNicknames(pairMatch[2])));
    }

    for (const betweenMatch of Array.from(
      haystack.matchAll(
        /entre\s+(.+?)\s+e\s+(.+?)(?:\s+foi|\s+foram|,|\.|$)/gi,
      ),
    )) {
      excludedPairs.add(
        getFightPairKey(stripNicknames(betweenMatch[1]), stripNicknames(betweenMatch[2])),
      );
    }
  }

  return excludedPairs;
}

function extractArticleFightAthletes(itemHtml: string): ParsedAthlete[] {
  const athletes = Array.from(
    itemHtml.matchAll(
      /<a[^>]*href="[^"]*\/athlete\/([a-z0-9-]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi,
    ),
  ).map((match) => ({
    slug: match[1].toLowerCase(),
    name: stripTags(match[2]) || slugToName(match[1].toLowerCase()),
  }));

  if (athletes.length >= 2) {
    return athletes.slice(0, 2);
  }

  const text = stripTags(itemHtml);
  const split = text.split(/\s+(?:x|vs\.?)\s+/i).map((chunk) => chunk.trim()).filter(Boolean);
  if (split.length < 2) return [];

  return split.slice(0, 2).map((name) => ({
    slug: "",
    name,
  }));
}

export function parseUfcCardListArticleHtml(
  html: string,
  url: string,
  excludedFightPairKeys: Set<string> = new Set(),
): ScrapedCardFight[] {
  const fights: ScrapedCardFight[] = [];
  const sectionRegex = /<h3>\s*(Card Principal|Card Preliminar)\s*<\/h3>\s*<ul>([\s\S]*?)<\/ul>/gi;
  let sectionMatch: RegExpExecArray | null;

  while ((sectionMatch = sectionRegex.exec(html)) !== null) {
    const heading = stripTags(sectionMatch[1]);
    const listHtml = sectionMatch[2];
    const cardType = /principal/i.test(heading) ? "main" : "preliminary";
    const itemMatches = Array.from(listHtml.matchAll(/<li>([\s\S]*?)<\/li>/gi));

    itemMatches.forEach((itemMatch, index) => {
      const athletes = extractArticleFightAthletes(itemMatch[1]);
      if (athletes.length < 2) return;

      const pairKey = getFightPairKey(athletes[0].name, athletes[1].name);
      if (excludedFightPairKeys.has(pairKey)) return;

      fights.push({
        fmid: `article-${cardType}-${index + 1}-${pairKey}`,
        card_type: cardType,
        fight_order: index + 1,
        weight_class: "Catchweight",
        is_title_fight: false,
        total_rounds: cardType === "main" && index === 0 ? 5 : 3,
        ufc_matchup_url: url,
        fighter_a: {
          name: athletes[0].name,
          country: "",
          headshot_url: "",
        },
        fighter_b: {
          name: athletes[1].name,
          country: "",
          headshot_url: "",
        },
      });
    });
  }

  return fights;
}

function mergeSupplementalScrapedCardFights(
  primaryFights: ScrapedCardFight[],
  supplementalFights: ScrapedCardFight[],
) {
  const merged = [...primaryFights];

  for (const supplementalFight of supplementalFights) {
    const alreadyPresent = merged.some((fight) =>
      fightPairMatches(
        {
          id: fight.fmid,
          fighter_a: { name: fight.fighter_a.name },
          fighter_b: { name: fight.fighter_b.name },
        },
        supplementalFight,
      ),
    );

    if (!alreadyPresent) {
      merged.push(supplementalFight);
    }
  }

  return merged;
}

export function mergeOfficialUfcCardFights(
  scrapedFights: ScrapedCardFight[],
  officialFights: UfcLiveCardFight[],
  eventUrl: string,
) {
  const baseUrl = new URL(eventUrl);
  baseUrl.hash = "";
  baseUrl.search = "";

  return officialFights.map((officialFight) => {
    const scrapedFight = scrapedFights.find((candidate) => {
      if (officialFight.fightId && officialFight.fightId === candidate.fmid) {
        return true;
      }

      return (
        (namesMatch(officialFight.fighterA.name, candidate.fighter_a.name) &&
          namesMatch(officialFight.fighterB.name, candidate.fighter_b.name)) ||
        (namesMatch(officialFight.fighterA.name, candidate.fighter_b.name) &&
          namesMatch(officialFight.fighterB.name, candidate.fighter_a.name))
      );
    });

    const scrapedFighters = scrapedFight
      ? [scrapedFight.fighter_a, scrapedFight.fighter_b]
      : [];
    const fighterA = scrapedFighters.find((fighter) =>
      namesMatch(fighter.name, officialFight.fighterA.name),
    );
    const fighterB = scrapedFighters.find((fighter) =>
      namesMatch(fighter.name, officialFight.fighterB.name),
    );
    const fallbackFmid = `api-${officialFight.cardType}-${officialFight.fightOrder}-${getFightPairKey(
      officialFight.fighterA.name,
      officialFight.fighterB.name,
    )}`;

    return {
      fmid: officialFight.fightId || scrapedFight?.fmid || fallbackFmid,
      card_type: officialFight.cardType,
      fight_order: officialFight.fightOrder,
      weight_class: officialFight.weightClass || scrapedFight?.weight_class || "Catchweight",
      is_title_fight: officialFight.isTitleFight,
      total_rounds: officialFight.totalRounds,
      ufc_matchup_url: `${baseUrl.toString().replace(/\/$/, "")}#${
        officialFight.fightId || scrapedFight?.fmid || fallbackFmid
      }`,
      fighter_a: fighterA || {
        name: officialFight.fighterA.name,
        country: "",
        headshot_url: "",
      },
      fighter_b: fighterB || {
        name: officialFight.fighterB.name,
        country: "",
        headshot_url: "",
      },
    };
  });
}

async function fetchEventNewsResults(eventName: string) {
  const query = stripTags(eventName).replace(/[|:]/g, " ").replace(/\s+/g, " ").trim();
  if (!query) return [];

  const response = await fetch(`${UFC_SITE_BASE}/search?query=${encodeURIComponent(query)}&type=news`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const html = await response.text();
  return parseUfcSearchNewsResults(html);
}

function pickCardListArticleUrl(results: SearchNewsResult[], eventName: string) {
  const matchupKey = getEventMatchupKey(eventName);
  const ranked = results
    .filter((result) => {
      const haystack = `${result.title} ${result.teaser}`;
      const resultMatchupKey = getEventMatchupKey(haystack);
      return !matchupKey || !resultMatchupKey || resultMatchupKey === matchupKey;
    })
    .sort((a, b) => {
      const score = (value: SearchNewsResult) => {
        const haystack = `${value.title} ${value.teaser}`.toLowerCase();
        let total = 0;
        if (/resultados/.test(haystack)) total += 4;
        if (/card completo/.test(haystack)) total += 4;
        if (/card/.test(haystack)) total += 2;
        if (/atualiza/.test(haystack)) total -= 3;
        if (/pesagem|encaradas|como assistir|pontua[cç][aã]o/.test(haystack)) total -= 2;
        return total;
      };

      return score(b) - score(a);
    });

  return ranked[0]?.url || null;
}

async function scrapeUfcCardListArticle(
  eventName: string,
): Promise<ScrapedCardFight[]> {
  try {
    const newsResults = await fetchEventNewsResults(eventName);
    if (!newsResults.length) return [];

    const excludedFightPairKeys = extractExcludedFightPairKeysFromNewsResults(newsResults);
    const articleUrl = pickCardListArticleUrl(newsResults, eventName);
    if (!articleUrl) return [];

    const response = await fetch(articleUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      cache: "no-store",
    });

    if (!response.ok) return [];
    const html = await response.text();
    return parseUfcCardListArticleHtml(html, articleUrl, excludedFightPairKeys);
  } catch {
    return [];
  }
}

export function parseUfcEventCardHtml(html: string, url: string): ScrapedCardFight[] {
  const eventUrl = new URL(url);
  const eventPath = eventUrl.pathname.replace(/\/$/, "");
  const mainPos = html.indexOf('id="main-card"');
  const prelimPos = html.indexOf('id="prelims-card"');
  const earlyPos = html.indexOf('id="early-prelims"');
  const sectionBoundaries = [mainPos, prelimPos, earlyPos].filter(
    (boundary) => boundary >= 0,
  );

  const fights: ScrapedCardFight[] = [];
  const counts: Record<"main" | "preliminary", number> = {
    main: 0,
    preliminary: 0,
  };

  const positions = getListingFightPositions(html);
  for (let index = 0; index < positions.length; index += 1) {
    const { fmid, pos } = positions[index];
    const nextPos = positions[index + 1]?.pos;
    const blockEnd = getBlockEnd(pos, nextPos, html.length, sectionBoundaries);
    const block = html.slice(pos, blockEnd);

    const athletes = extractFightAthletes(block);
    if (athletes.length < 2) continue;

    const cardType = getCardTypeForPosition(pos, mainPos, prelimPos, earlyPos);
    const countries = extractCountryNames(block);
    const headshots = extractEventCardHeadshots(block, UFC_SITE_BASE);
    const weightClass = extractWeightClassFromHtmlBlock(block);
    const isTitleFight =
      /title\s+fight|disputa\s+de\s+t[ií]tulo|championship\s+bout|disputa\s+de\s+cintur[aã]o|cintur[aã]o/i.test(
        block,
      );

    counts[cardType] += 1;
    const fightOrder = counts[cardType];
    const totalRounds =
      (cardType === "main" && fightOrder === 1) || isTitleFight ? 5 : 3;

    fights.push({
      fmid,
      card_type: cardType,
      fight_order: fightOrder,
      weight_class: weightClass,
      is_title_fight: isTitleFight,
      total_rounds: totalRounds,
      ufc_matchup_url: `${eventUrl.origin}${eventPath}#${fmid}`,
      fighter_a: {
        name: athletes[0].name,
        country: countries[0] || "",
        headshot_url: headshots[0] || "",
      },
      fighter_b: {
        name: athletes[1].name,
        country: countries[1] || "",
        headshot_url: headshots[1] || "",
      },
    });
  }

  return fights;
}

function getFightParticipantName(
  participant: ExistingFightLike["fighter_a"] | ExistingFightLike["fighter_b"],
) {
  if (Array.isArray(participant)) {
    return participant[0]?.name || "";
  }

  return participant?.name || "";
}

export function fightPairMatches(dbFight: ExistingFightLike, scrapedFight: ScrapedCardFight) {
  const fighterA = getFightParticipantName(dbFight.fighter_a);
  const fighterB = getFightParticipantName(dbFight.fighter_b);

  return (
    (namesMatch(fighterA, scrapedFight.fighter_a.name) &&
      namesMatch(fighterB, scrapedFight.fighter_b.name)) ||
    (namesMatch(fighterA, scrapedFight.fighter_b.name) &&
      namesMatch(fighterB, scrapedFight.fighter_a.name))
  );
}

function getFightChanges(
  existingFight: ExistingFightLike,
  scrapedFight: ScrapedCardFight,
): FightChanges {
  const changes: FightChanges = {};

  if ((existingFight.weight_class || "") !== scrapedFight.weight_class) {
    changes.weight_class = {
      from: existingFight.weight_class || "",
      to: scrapedFight.weight_class,
    };
  }

  if ((existingFight.card_type || "") !== scrapedFight.card_type) {
    changes.card_type = {
      from: existingFight.card_type || "",
      to: scrapedFight.card_type,
    };
  }

  if ((existingFight.fight_order || 0) !== scrapedFight.fight_order) {
    changes.fight_order = {
      from: existingFight.fight_order || 0,
      to: scrapedFight.fight_order,
    };
  }

  if ((existingFight.is_title_fight || false) !== scrapedFight.is_title_fight) {
    changes.is_title_fight = {
      from: existingFight.is_title_fight || false,
      to: scrapedFight.is_title_fight,
    };
  }

  if ((existingFight.total_rounds || 0) !== scrapedFight.total_rounds) {
    changes.total_rounds = {
      from: existingFight.total_rounds || 0,
      to: scrapedFight.total_rounds,
    };
  }

  if ((existingFight.ufc_matchup_url || "") !== scrapedFight.ufc_matchup_url) {
    changes.ufc_matchup_url = {
      from: existingFight.ufc_matchup_url || "",
      to: scrapedFight.ufc_matchup_url,
    };
  }

  return changes;
}

export function diffScrapedCardAgainstExistingFights(
  dbFights: ExistingFightLike[],
  scrapedFights: ScrapedCardFight[],
): ScrapedCardDiff {
  const added: ScrapedCardFight[] = [];
  const updated: ScrapedCardDiff["updated"] = [];
  const matchedDbIds = new Set<string>();
  let unchangedCount = 0;

  for (const scrapedFight of scrapedFights) {
    const existingFight = dbFights
      .filter(
        (dbFight) => !matchedDbIds.has(dbFight.id) && fightPairMatches(dbFight, scrapedFight),
      )
      .sort((left, right) => {
        if (Boolean(left.result_confirmed) !== Boolean(right.result_confirmed)) {
          return left.result_confirmed ? -1 : 1;
        }

        return (left.created_at || "").localeCompare(right.created_at || "");
      })[0];

    if (!existingFight) {
      added.push(scrapedFight);
      continue;
    }

    matchedDbIds.add(existingFight.id);
    const changes = getFightChanges(existingFight, scrapedFight);

    if (Object.keys(changes).length === 0) {
      unchangedCount += 1;
      continue;
    }

    updated.push({
      db_id: existingFight.id,
      changes,
      fight: scrapedFight,
      existingFight,
    });
  }

  const duplicates = dbFights.filter((dbFight) => {
    if (dbFight.result_confirmed) return false;
    if (matchedDbIds.has(dbFight.id)) return false;
    return scrapedFights.some((scrapedFight) => fightPairMatches(dbFight, scrapedFight));
  });

  const removed = dbFights.filter((dbFight) => {
    if (dbFight.result_confirmed) return false;
    if (matchedDbIds.has(dbFight.id)) return false;
    return !scrapedFights.some((scrapedFight) => fightPairMatches(dbFight, scrapedFight));
  });

  return {
    added,
    duplicates,
    removed,
    updated,
    unchanged_count: unchangedCount,
  };
}

export async function scrapeUfcEventCard(url: string): Promise<ScrapedCardFight[]> {
  if (!isAllowedScrapeUrl(url)) {
    throw new Error("Host não permitido para scraping");
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`UFC.com HTTP ${response.status}`);
  }

  const html = await response.text();
  const primaryFights = parseUfcEventCardHtml(html, url);
  const eventName = parseEventTitleFromHtml(html);
  const liveEventId = extractUfcLiveEventId(html);
  const [articleFights, official] = await Promise.all([
    eventName ? scrapeUfcCardListArticle(eventName) : Promise.resolve([]),
    liveEventId ? fetchUfcLiveEvent(liveEventId).catch(() => null) : Promise.resolve(null),
  ]);
  const scrapedFights = mergeSupplementalScrapedCardFights(
    primaryFights,
    articleFights,
  );

  return official?.event.fights.length
    ? mergeOfficialUfcCardFights(scrapedFights, official.event.fights, url)
    : scrapedFights;
}

export async function ensureFighter(adminSupabase: any, fighter: ScrapedCardFight["fighter_a"]) {
  let candidate = { ...fighter };
  if (!isUsableHeadshotUrl(candidate.headshot_url) || !candidate.country) {
    const resolved = await resolveUfcFighterMedia(candidate.name);
    if (resolved) {
      candidate = {
        ...candidate,
        headshot_url: isUsableHeadshotUrl(candidate.headshot_url)
          ? candidate.headshot_url
          : resolved.headshot_url,
        country: candidate.country || resolved.country,
      };
    }
  }

  const { data: existing, error: existingError } = await adminSupabase
    .from("fighters")
    .select("id, headshot_url, country")
    .eq("name", candidate.name)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    const update: Record<string, unknown> = {};
    if (
      isUsableHeadshotUrl(candidate.headshot_url) &&
      existing.headshot_url !== candidate.headshot_url
    ) {
      update.headshot_url = candidate.headshot_url;
    }
    if (candidate.country && existing.country !== candidate.country) {
      update.country = candidate.country;
    }

    if (Object.keys(update).length > 0) {
      const { error: updateError } = await adminSupabase
        .from("fighters")
        .update(update)
        .eq("id", existing.id);
      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    return existing.id as string;
  }

  const { data: created, error: createError } = await adminSupabase
    .from("fighters")
    .insert({
      name: candidate.name,
      headshot_url: isUsableHeadshotUrl(candidate.headshot_url) ? candidate.headshot_url : "",
      country: candidate.country || "",
    })
    .select("id")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message || `Falha ao criar fighter ${candidate.name}`);
  }

  return created.id as string;
}

export async function syncScrapedCardForEvent(
  adminSupabase: any,
  eventId: string,
  eventUrl: string,
) {
  const scrapedFights = await scrapeUfcEventCard(eventUrl);

  const { data: currentFights, error: currentFightsError } = await adminSupabase
    .from("fights")
    .select(
      `id, created_at, weight_class, card_type, fight_order, is_title_fight, total_rounds, result_confirmed, ufc_matchup_url,
      fighter_a:fighters!fighter_a_id(id, name),
      fighter_b:fighters!fighter_b_id(id, name)`,
    )
    .eq("event_id", eventId);

  if (currentFightsError) {
    throw new Error(currentFightsError.message);
  }

  const dbFights = (currentFights || []) as ExistingFightLike[];
  const diff = diffScrapedCardAgainstExistingFights(dbFights, scrapedFights);
  const added: string[] = [];
  const duplicatesRemoved: string[] = [];
  const updated: string[] = [];

  for (const scrapedFight of diff.added) {
    const fighterAId = await ensureFighter(adminSupabase, scrapedFight.fighter_a);
    const fighterBId = await ensureFighter(adminSupabase, scrapedFight.fighter_b);

    const { error: insertError } = await adminSupabase.from("fights").insert({
      event_id: eventId,
      fighter_a_id: fighterAId,
      fighter_b_id: fighterBId,
      card_type: scrapedFight.card_type,
      fight_order: scrapedFight.fight_order,
      weight_class: scrapedFight.weight_class,
      is_title_fight: scrapedFight.is_title_fight,
      total_rounds: scrapedFight.total_rounds,
      ufc_matchup_url: scrapedFight.ufc_matchup_url,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    added.push(`${scrapedFight.fighter_a.name} vs ${scrapedFight.fighter_b.name}`);
  }

  for (const updatedFight of diff.updated) {
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updatedFight.changes)) {
      updateData[key] = value.to;
    }

    const { error: updateError } = await adminSupabase
      .from("fights")
      .update(updateData)
      .eq("id", updatedFight.db_id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    updated.push(
      `${updatedFight.fight.fighter_a.name} vs ${updatedFight.fight.fighter_b.name}`,
    );
  }

  for (const duplicate of diff.duplicates) {
    const label = `${getFightParticipantName(duplicate.fighter_a)} vs ${getFightParticipantName(duplicate.fighter_b)}`;
    const { error: picksError } = await adminSupabase
      .from("picks")
      .delete()
      .eq("fight_id", duplicate.id);

    if (picksError) {
      throw new Error(picksError.message);
    }

    const { error: deleteError } = await adminSupabase
      .from("fights")
      .delete()
      .eq("id", duplicate.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    duplicatesRemoved.push(label);
  }

  return {
    scraped_count: scrapedFights.length,
    added_count: diff.added.length,
    duplicates_removed_count: diff.duplicates.length,
    updated_count: diff.updated.length,
    unchanged_count: diff.unchanged_count,
    added,
    duplicates_removed: duplicatesRemoved,
    updated,
  };
}
