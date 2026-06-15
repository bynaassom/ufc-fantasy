import { fetchUfcStatsHtml, namesMatch } from "@/lib/ufc-results-sync";

const COMPLETED_EVENTS_URL = "http://ufcstats.com/statistics/events/completed?page=all";

const MONTH_NAMES: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
};

export function parseUfcStatsEventDate(text: string): string | null {
  const cleaned = text.replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const match = cleaned.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (!match) return null;
  const [, monthName, day, year] = match;
  const month = MONTH_NAMES[monthName.toLowerCase()];
  if (!month) return null;
  return `${year}-${month}-${day.padStart(2, "0")}`;
}

export async function fetchUfcStatsEventListHtml(): Promise<string> {
  return fetchUfcStatsHtml(COMPLETED_EVENTS_URL);
}

export async function discoverUfcStatsUrl(
  eventName: string,
  eventDate?: string,
): Promise<string | null> {
  try {
    const html = await fetchUfcStatsEventListHtml();

    const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const rowHtml = rowMatch[1];

      const linkMatch = rowHtml.match(
        /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i,
      );
      if (!linkMatch) continue;

      const href = linkMatch[1];
      const linkText = linkMatch[2]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (!namesMatch(linkText, eventName)) continue;

      const cells = Array.from(
        rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi),
      );
      const dateCell = cells[1]
        ? cells[1][1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        : null;

      if (eventDate && dateCell) {
        const parsed = parseUfcStatsEventDate(dateCell);
        if (parsed && parsed !== eventDate.slice(0, 10)) continue;
      }

      if (href.startsWith("http://") || href.startsWith("https://")) {
        return href;
      }
      if (href.startsWith("//")) {
        return `http:${href}`;
      }
      if (href.startsWith("/")) {
        return `http://ufcstats.com${href}`;
      }
      return `http://ufcstats.com/${href}`;
    }

    return null;
  } catch {
    return null;
  }
}

export default discoverUfcStatsUrl;
