// UFC unofficial API integration
// Uses the beta.ufc.com API when available and falls back to scraping
// the official events page when the unofficial API is unavailable.

const UFC_API_BASE = "https://api.beta.ufc.com/v1";
const UFC_EVENTS_PAGE = "https://www.ufc.com.br/events";

export interface UFCEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  image?: string;
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

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function parseUpcomingEventsFromHtml(html: string): UFCEvent[] {
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
    const image =
      card.match(/<img[^>]+src="([^"]+EVENT-ART[^"]+)"/)?.[1] ||
      card.match(/<img[^>]+src="([^"]+)"/)?.[1];
    const venue = card.match(/field--name-taxonomy-term-title[\s\S]*?<h5>\s*([\s\S]*?)\s*<\/h5>/)?.[1];
    const address = card.match(/field--name-location[\s\S]*?<p class="address"[^>]*>([\s\S]*?)<\/p>/)?.[1];

    if (!href || !headline || !timestamp) continue;

    const date = new Date(Number(timestamp) * 1000).toISOString();
    const location = [stripTags(venue || ""), stripTags(address || "")]
      .filter(Boolean)
      .join(", ");

    events.push({
      id: href,
      name: stripTags(headline),
      date,
      location,
      image: image || undefined,
      cards: [],
    });
  }

  return events;
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
    return data.data || [];
  } catch (error) {
    console.error("UFC API error (upcoming events):", error);
    try {
      const response = await fetch(UFC_EVENTS_PAGE, {
        next: { revalidate: 3600 },
        headers: { Accept: "text/html,application/xhtml+xml" },
      });
      if (!response.ok) throw new Error("Failed to fetch UFC events page");
      const html = await response.text();
      return parseUpcomingEventsFromHtml(html).slice(0, 5);
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

export const WEIGHT_CLASS_PT: Record<string, string> = {
  Strawweight: "Palha",
  Flyweight: "Mosca",
  Bantamweight: "Galo",
  Featherweight: "Pena",
  Lightweight: "Leve",
  Welterweight: "Meio-Médio",
  Middleweight: "Médio",
  "Light Heavyweight": "Meio-Pesado",
  Heavyweight: "Pesado",
};
