import { WEIGHT_CLASS_PT } from "@/lib/ufc-weight";
import {
  extractUfcLiveEventId,
  fetchUfcLiveEvent,
  type UfcLiveEvent,
  type UfcLiveEventStatus,
} from "@/lib/ufc-live-api";

// UFC unofficial API integration
// Uses the beta.ufc.com API when available and falls back to scraping
// the official events page when the unofficial API is unavailable.

const UFC_API_BASE = "https://api.beta.ufc.com/v1";
const UFC_EVENTS_PAGE = "https://www.ufc.com.br/events";
const UFC_SITE_BASE = "https://www.ufc.com.br";

export interface UFCEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  image?: string;
  eventUrl?: string;
  prelimsStartAt?: string;
  officialApiEventId?: string;
  status?: UfcLiveEventStatus;
  cards: UFCCard[];
}

export interface UFCCard {
  type: "main" | "preliminary";
  bouts: UFCBout[];
}

export interface UFCBout {
  id: string;
  fighters: UFCFighter[];
  weightClass: string;
  isTitleBout: boolean;
  scheduledRounds: number;
  result?: UFCResult;
}

export interface UFCFighter {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  headshot?: string;
  country?: string;
}

export interface UFCResult {
  winnerId: string;
  method: string;
  round: number;
  time: string;
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function normalizeUfcEventImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const cleaned = decodeHtml(value)
    .replace(/\\u0026/gi, "&")
    .replace(/\\\//g, "/")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+(?:\d+(?:\.\d+)?x|\d+w)$/i, "");
  const absolute = cleaned.startsWith("//")
    ? `https:${cleaned}`
    : cleaned.startsWith("/")
      ? `${UFC_SITE_BASE}${cleaned}`
      : cleaned;

  try {
    const parsed = new URL(absolute);
    const host = parsed.hostname.toLowerCase();
    const isOfficialHost =
      host === "ufc.com" ||
      host.endsWith(".ufc.com") ||
      host === "ufc.com.br" ||
      host.endsWith(".ufc.com.br");
    const isImage = /\.(?:avif|gif|jpe?g|png|webp)$/i.test(parsed.pathname);

    if (!isOfficialHost || !isImage) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function isOfficialUfcEventImageUrl(value: unknown) {
  return normalizeUfcEventImageUrl(value) !== null;
}

function getEventImageScore(url: string) {
  const normalized = url.toLowerCase();
  let score = normalized.includes("event-art") ? 1_000 : 0;
  if (normalized.includes("background_image_xl_2x")) score += 500;
  else if (normalized.includes("background_image_xl")) score += 400;
  else if (normalized.includes("background_image_lg_2x")) score += 300;
  else if (normalized.includes("background_image_lg")) score += 200;
  else if (normalized.includes("background_image_")) score += 100;
  return score;
}

export function extractUfcEventBannerUrl(html: string): string | null {
  if (!html) return null;

  const decoded = decodeHtml(html)
    .replace(/\\u0026/gi, "&")
    .replace(/\\\//g, "/");
  const rawCandidates = decoded.match(
    /(?:(?:https?:)?\/\/|\/)[^\s"'<>(),]+\.(?:avif|gif|jpe?g|png|webp)(?:\?[^\s"'<>(),]*)?/gi,
  ) || [];
  const metaCandidates = [
    ...Array.from(
      decoded.matchAll(
        /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
      ),
      (match) => match[1],
    ),
    ...Array.from(
      decoded.matchAll(
        /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*>/gi,
      ),
      (match) => match[1],
    ),
  ];
  const candidates = [...rawCandidates, ...metaCandidates]
    .map(normalizeUfcEventImageUrl)
    .filter((value): value is string => Boolean(value));
  const eventArtCandidates = candidates.filter((url) => /event-art/i.test(url));
  const eligible = eventArtCandidates.length
    ? eventArtCandidates
    : metaCandidates
        .map(normalizeUfcEventImageUrl)
        .filter((value): value is string => Boolean(value));

  return [...new Set(eligible)]
    .map((url, index) => ({ url, index, score: getEventImageScore(url) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.url || null;
}

export function resolveSyncedEventBannerUrl(
  existingBanner: string | null | undefined,
  upstreamBanner: string | null | undefined,
) {
  const incoming = normalizeUfcEventImageUrl(upstreamBanner);
  const existing = existingBanner?.trim() || null;

  if (!incoming) return existing;
  if (!existing || isOfficialUfcEventImageUrl(existing)) return incoming;
  return existing;
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function absolutizeUfcUrl(pathOrUrl: string) {
  if (!pathOrUrl) return UFC_SITE_BASE;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  return `${UFC_SITE_BASE}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

function slugifyEventName(name: string) {
  return stripTags(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bversus\b/g, "vs")
    .replace(/\bx\b/g, "vs")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getEventMatchupKey(name: string) {
  const normalized = slugifyEventName(name);
  const parts = normalized.split(/[:-]/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : normalized;
}

function toIsoString(value: unknown) {
  if (!value) return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function pickFirstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function resolveApiEventUrl(rawEvent: any, fallbackName: string) {
  const directUrl = pickFirstString(
    rawEvent?.eventUrl,
    rawEvent?.url,
    rawEvent?.webUrl,
    rawEvent?.path,
    rawEvent?.href,
    rawEvent?.seoUrl,
    rawEvent?.route,
    rawEvent?.link,
    rawEvent?.uri,
  );

  if (directUrl) {
    return absolutizeUfcUrl(directUrl);
  }

  const slug = pickFirstString(rawEvent?.slug, rawEvent?.seoName);
  if (slug) {
    return absolutizeUfcUrl(`/event/${slug.replace(/^\/?event\//, "")}`);
  }

  const fallbackSlug = slugifyEventName(fallbackName);
  return fallbackSlug ? absolutizeUfcUrl(`/event/${fallbackSlug}`) : undefined;
}

function normalizeEventName(name: string) {
  return stripTags(name)
    .replace(/\s+\|\s+UFC\s+[A-Za-zÀ-ÿ' -]+$/i, "")
    .replace(/^UFC Fight Night\s+\|\s+/i, "UFC Fight Night: ")
    .replace(/^UFC\s+(\d+)\s+\|\s+/i, "UFC $1: ")
    .replace(/\s+/g, " ")
    .trim();
}

function needsFullEventTitle(name: string) {
  return !/^UFC\b/i.test(name);
}

function parseEventPageTitle(html: string) {
  const titleTag = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  const ogTitle =
    html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] ||
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i)?.[1];

  const candidates = [titleTag, ogTitle].filter(Boolean) as string[];
  for (const candidate of candidates) {
    const normalized = normalizeEventName(
      candidate
      .replace(/\s*\|\s*UFC\s*$/i, "")
      .replace(/\s*\|\s*Ultimate Fighting Championship\s*$/i, ""),
    );

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function applyOfficialUfcEventMetadata(
  event: UFCEvent,
  official: UfcLiveEvent,
): UFCEvent {
  return {
    ...event,
    name: official.name || event.name,
    date: official.startTime || event.date,
    location: official.location || event.location,
    prelimsStartAt: official.prelimsStartAt || official.startTime || event.prelimsStartAt,
    officialApiEventId: official.eventId,
    status: official.status,
  };
}

async function enrichUpcomingEventNames(events: UFCEvent[]): Promise<UFCEvent[]> {
  return Promise.all(
    events.map(async (event) => {
      try {
        const response = await fetch(absolutizeUfcUrl(event.eventUrl || event.id), {
          next: { revalidate: 3600 },
          headers: { Accept: "text/html,application/xhtml+xml" },
        });
        if (!response.ok) return event;

        const html = await response.text();
        const fullTitle = parseEventPageTitle(html);
        const bannerImage = extractUfcEventBannerUrl(html);
        const liveEventId = extractUfcLiveEventId(html);
        const official = liveEventId
          ? await fetchUfcLiveEvent(liveEventId).catch(() => null)
          : null;

        const titledEvent = {
          ...event,
          name:
            needsFullEventTitle(event.name) && fullTitle ? fullTitle : event.name,
          image: bannerImage || event.image,
          officialApiEventId: liveEventId || undefined,
        };
        return official
          ? applyOfficialUfcEventMetadata(titledEvent, official.event)
          : titledEvent;
      } catch {
        return event;
      }
    }),
  );
}

export function parseUpcomingEventsFromHtml(html: string): UFCEvent[] {
  const upcomingStart = html.indexOf('id="events-list-upcoming"');
  const pastStart = html.indexOf('id="events-list-past"');
  const section =
    upcomingStart >= 0
      ? html.slice(upcomingStart, pastStart >= 0 ? pastStart : undefined)
      : html;

  const cards = section.match(/<article class="c-card-event--result">[\s\S]*?<\/article>[\s\S]*?<div class="c-card-event--result__actions">/g) || [];

  const events: UFCEvent[] = [];

  for (const card of cards) {
    const href = card.match(/c-card-event--result__headline"><a href="([^"]+)"/)?.[1];
    const headline = card.match(/c-card-event--result__headline"><a [^>]+>([\s\S]*?)<\/a>/)?.[1];
    const timestamp = card.match(/data-main-card-timestamp="([^"]+)"/)?.[1];
    const prelimsTimestamp = card.match(/data-prelims-card-timestamp="([^"]+)"/)?.[1];
    const earlyPrelimsTimestamp = card.match(/data-early-card-timestamp="([^"]+)"/)?.[1];
    const image = extractUfcEventBannerUrl(card);
    const venue = card.match(/field--name-taxonomy-term-title[\s\S]*?<h5>\s*([\s\S]*?)\s*<\/h5>/)?.[1];
    const address = card.match(/field--name-location[\s\S]*?<p class="address"[^>]*>([\s\S]*?)<\/p>/)?.[1];

    if (!href || !headline || !timestamp) continue;

    const date = new Date(Number(timestamp) * 1000).toISOString();
    const firstPrelimsTimestamp = [earlyPrelimsTimestamp, prelimsTimestamp]
      .map(Number)
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b)[0];
    const location = [stripTags(venue || ""), stripTags(address || "")]
      .filter(Boolean)
      .join(", ");

    events.push({
      id: href,
      name: normalizeEventName(headline),
      date,
      location,
      image: image || undefined,
      eventUrl: absolutizeUfcUrl(href),
      prelimsStartAt: firstPrelimsTimestamp
        ? new Date(firstPrelimsTimestamp * 1000).toISOString()
        : undefined,
      cards: [],
    });
  }

  return events;
}

function normalizeUpcomingApiEvent(rawEvent: any): UFCEvent | null {
  const name = pickFirstString(
    rawEvent?.name,
    rawEvent?.title,
    rawEvent?.shortName,
    rawEvent?.headline,
  );
  const date = toIsoString(
    rawEvent?.date ??
      rawEvent?.eventDate ??
      rawEvent?.startDate ??
      rawEvent?.startDateTime ??
      rawEvent?.startTime,
  );

  if (!name || !date) return null;

  const location = pickFirstString(
    rawEvent?.location,
    rawEvent?.venue,
    [rawEvent?.city, rawEvent?.state, rawEvent?.country].filter(Boolean).join(", "),
  );

  const image = [
    rawEvent?.image,
    rawEvent?.image?.url,
    rawEvent?.heroImage,
    rawEvent?.heroImage?.url,
    rawEvent?.eventImage,
    rawEvent?.eventImage?.url,
    rawEvent?.posterImage,
    rawEvent?.posterImage?.url,
    rawEvent?.banner,
    rawEvent?.banner?.url,
  ]
    .map(normalizeUfcEventImageUrl)
    .find((value): value is string => Boolean(value));

  return {
    id: String(rawEvent?.id ?? rawEvent?.eventId ?? rawEvent?.slug ?? name),
    name: normalizeEventName(name),
    date,
    location,
    image: image || undefined,
    eventUrl: resolveApiEventUrl(rawEvent, name),
    cards: [],
  };
}

function mergeUpcomingEventMetadata(primaryEvents: UFCEvent[], pageEvents: UFCEvent[]) {
  const pageByDateMatchup = new Map<string, UFCEvent>();
  const pageByMatchup = new Map<string, UFCEvent[]>();

  for (const event of pageEvents) {
    const dateKey = event.date.slice(0, 10);
    const matchupKey = getEventMatchupKey(event.name);
    if (matchupKey) {
      pageByDateMatchup.set(`${dateKey}:${matchupKey}`, event);
      const current = pageByMatchup.get(matchupKey) || [];
      current.push(event);
      pageByMatchup.set(matchupKey, current);
    }
  }

  return primaryEvents.map((event) => {
    const dateKey = event.date.slice(0, 10);
    const matchupKey = getEventMatchupKey(event.name);
    const exactMatch = matchupKey
      ? pageByDateMatchup.get(`${dateKey}:${matchupKey}`)
      : null;

    let closestMatch: UFCEvent | null = exactMatch || null;
    if (!closestMatch && matchupKey) {
      const candidates = pageByMatchup.get(matchupKey) || [];
      const eventTime = new Date(event.date).getTime();
      const nearest = candidates
        .map((candidate) => ({
          candidate,
          diff: Math.abs(new Date(candidate.date).getTime() - eventTime),
        }))
        .sort((a, b) => a.diff - b.diff)[0];

      if (nearest && nearest.diff <= 12 * 60 * 60 * 1000) {
        closestMatch = nearest.candidate;
      }
    }

    if (!closestMatch) return event;

    return {
      ...event,
      date: closestMatch.officialApiEventId ? closestMatch.date : event.date,
      name: needsFullEventTitle(event.name) ? closestMatch.name : event.name,
      location: event.location || closestMatch.location,
      image: event.image || closestMatch.image,
      eventUrl: event.eventUrl || closestMatch.eventUrl,
      prelimsStartAt: closestMatch.officialApiEventId
        ? closestMatch.prelimsStartAt
        : event.prelimsStartAt || closestMatch.prelimsStartAt,
      officialApiEventId:
        event.officialApiEventId || closestMatch.officialApiEventId,
      status: closestMatch.officialApiEventId
        ? closestMatch.status
        : event.status || closestMatch.status,
    };
  });
}

export async function fetchUpcomingUFCEventsFromPage(
  limit = 5,
  fresh = false,
): Promise<UFCEvent[]> {
  const response = await fetch(UFC_EVENTS_PAGE, fresh
    ? {
        cache: "no-store",
        headers: { Accept: "text/html,application/xhtml+xml" },
      }
    : {
        next: { revalidate: 3600 },
        headers: { Accept: "text/html,application/xhtml+xml" },
      });
  if (!response.ok) throw new Error("Failed to fetch UFC events page");
  const html = await response.text();
  const parsedEvents = parseUpcomingEventsFromHtml(html).slice(0, limit);
  return enrichUpcomingEventNames(parsedEvents);
}

export async function fetchUpcomingUFCEvents(): Promise<UFCEvent[]> {
  try {
    const response = await fetch(
      `${UFC_API_BASE}/events?status=upcoming&limit=5`,
      {
        next: { revalidate: 3600 },
        headers: { "Accept": "application/json" },
      }
    );
    if (!response.ok) throw new Error("Failed to fetch UFC events");
    const data = await response.json();
    const normalizedApiEvents = Array.isArray(data?.data)
      ? data.data
          .map((event: any) => normalizeUpcomingApiEvent(event))
          .filter(Boolean) as UFCEvent[]
      : [];

    if (!normalizedApiEvents.length) {
      throw new Error("Upcoming events API returned no usable events");
    }

    try {
      const pageEvents = await fetchUpcomingUFCEventsFromPage();
      return mergeUpcomingEventMetadata(normalizedApiEvents, pageEvents);
    } catch {
      return enrichUpcomingEventNames(normalizedApiEvents);
    }
  } catch (error) {
    console.error("UFC API error (upcoming events):", error);
    try {
      return await fetchUpcomingUFCEventsFromPage();
    } catch (fallbackError) {
      console.error("UFC events page fallback error:", fallbackError);
      return [];
    }
  }
}

export async function fetchUFCEvent(eventId: string): Promise<UFCEvent | null> {
  try {
    const response = await fetch(`${UFC_API_BASE}/events/${eventId}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) throw new Error("Failed to fetch event");
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error("UFC API error (event):", error);
    return null;
  }
}

export async function fetchFighterHeadshot(fighterId: string): Promise<string | null> {
  try {
    const response = await fetch(`${UFC_API_BASE}/athletes/${fighterId}`, {
      next: { revalidate: 86400 },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data?.image || null;
  } catch {
    return null;
  }
}

// Normalize method name from UFC API to our schema
export function normalizeMethod(method: string): "decision" | "submission" | "knockout" | null {
  const m = method?.toLowerCase() || "";
  if (m.includes("decision") || m.includes("dec")) return "decision";
  if (m.includes("submission") || m.includes("sub")) return "submission";
  if (m.includes("knockout") || m.includes("ko") || m.includes("tko")) return "knockout";
  return null;
}

export const WEIGHT_CLASSES = [
  "Strawweight",
  "Flyweight",
  "Bantamweight",
  "Featherweight",
  "Lightweight",
  "Welterweight",
  "Middleweight",
  "Light Heavyweight",
  "Heavyweight",
];

export { WEIGHT_CLASS_PT };
