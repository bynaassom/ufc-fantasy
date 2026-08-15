import { unstable_cache } from "next/cache";
import type { EventWithFights, FightWithFighters } from "@/types";
import {
  extractUfcLiveEventId,
  fetchUfcLiveEvent,
  type UfcFightLivePhase,
  type UfcLiveCardFight,
  type UfcLiveEvent,
} from "@/lib/ufc-live-api";
import { isAllowedScrapeUrl } from "@/lib/security";

const ACTIVE_PHASES = new Set<UfcFightLivePhase>([
  "walkouts",
  "introductions",
  "live",
  "between_rounds",
  "awaiting_result",
]);

export type OfficialLiveFight = UfcLiveCardFight & {
  localFightId: string | null;
};

export type OfficialLiveState = {
  eventId: string;
  status: UfcLiveEvent["status"];
  fetchedAt: string;
  completedCount: number;
  totalCount: number;
  currentFight: OfficialLiveFight | null;
  nextFight: OfficialLiveFight | null;
  fights: OfficialLiveFight[];
};

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function matchupKey(fighterA: string, fighterB: string) {
  return [normalizeName(fighterA), normalizeName(fighterB)].sort().join(":");
}

function numericEventId(value?: string | null) {
  const normalized = String(value || "").trim();
  if (/^\d+$/.test(normalized)) return normalized;
  return normalized.match(/\/live\/(\d+)\.json/i)?.[1] || null;
}

const getCachedOfficialEventId = unstable_cache(
  async (slug: string, sourceId: string | null) => {
    const direct = numericEventId(sourceId);
    if (direct) return direct;

    const candidates = Array.from(
      new Set(
        [
          sourceId,
          `https://www.ufc.com.br/event/${slug}`,
          `https://www.ufc.com/event/${slug}`,
        ].filter((value): value is string => Boolean(value)),
      ),
    );

    for (const url of candidates) {
      if (!isAllowedScrapeUrl(url)) continue;
      try {
        const response = await fetch(url, {
          headers: { Accept: "text/html,application/xhtml+xml" },
          next: { revalidate: 21_600 },
        });
        if (!response.ok) continue;
        const eventId = extractUfcLiveEventId(await response.text());
        if (eventId) return eventId;
      } catch {
        // Tenta a próxima URL oficial.
      }
    }

    return null;
  },
  ["official-ufc-event-id"],
  { revalidate: 21_600 },
);

const getCachedOfficialEvent = unstable_cache(
  async (eventId: string) => (await fetchUfcLiveEvent(eventId)).event,
  ["official-ufc-live-event"],
  { revalidate: 15 },
);

function mapOfficialFights(
  officialFights: UfcLiveCardFight[],
  localFights: FightWithFighters[],
) {
  const localByMatchup = new Map(
    localFights.map((fight) => [
      matchupKey(fight.fighter_a.name, fight.fighter_b.name),
      fight.id,
    ]),
  );

  return officialFights
    .map((fight) => ({
      ...fight,
      localFightId:
        localByMatchup.get(matchupKey(fight.fighterA.name, fight.fighterB.name)) ||
        null,
    }))
    .sort((a, b) => b.fightOrder - a.fightOrder);
}

export async function getOfficialLiveState(
  event: EventWithFights,
): Promise<OfficialLiveState | null> {
  try {
    const eventId = await getCachedOfficialEventId(
      event.slug,
      event.ufc_event_id || null,
    );
    if (!eventId) return null;

    const official = await getCachedOfficialEvent(eventId);
    const fights = mapOfficialFights(
      official.fights,
      event.fights as FightWithFighters[],
    );
    const currentIndex = fights.findIndex((fight) =>
      ACTIVE_PHASES.has(fight.phase),
    );
    const currentFight = currentIndex >= 0 ? fights[currentIndex] : null;
    const nextFight = currentFight
      ? fights.slice(currentIndex + 1).find((fight) => fight.phase === "upcoming") ||
        null
      : fights.find((fight) => fight.phase === "upcoming") || null;

    return {
      eventId: official.eventId,
      status: official.status,
      fetchedAt: new Date().toISOString(),
      completedCount: fights.filter((fight) => fight.phase === "completed").length,
      totalCount: fights.length,
      currentFight,
      nextFight,
      fights,
    };
  } catch (error) {
    console.error("Failed to load official UFC live state", error);
    return null;
  }
}
