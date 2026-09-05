import { unstable_cache } from "next/cache";
import type { EventWithFights, FightWithFighters } from "@/types";
import {
  extractUfcLiveEventId,
  fetchUfcLiveEvent,
  type UfcFightLivePhase,
  type UfcLiveCardFight,
  type UfcLiveEvent,
} from "@/lib/ufc-live-api";
import { namesMatch } from "@/lib/ufc-results-sync";
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

function matchupNamesMatch(
  officialFight: UfcLiveCardFight,
  localFight: Pick<FightWithFighters, "fighter_a" | "fighter_b">,
) {
  const sameCorners =
    namesMatch(officialFight.fighterA.name, localFight.fighter_a.name) &&
    namesMatch(officialFight.fighterB.name, localFight.fighter_b.name);
  const swappedCorners =
    namesMatch(officialFight.fighterA.name, localFight.fighter_b.name) &&
    namesMatch(officialFight.fighterB.name, localFight.fighter_a.name);

  return sameCorners || swappedCorners;
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
  localFights: Array<
    Pick<FightWithFighters, "id" | "fighter_a" | "fighter_b">
  >,
) {
  const remainingLocalFights = new Map(
    localFights.map((fight) => [fight.id, fight]),
  );
  const matchedLocalIds = new Map<number, string>();

  const claimUniqueMatch = (
    officialIndex: number,
    predicate: (
      localFight: Pick<
        FightWithFighters,
        "id" | "fighter_a" | "fighter_b"
      >,
    ) => boolean,
  ) => {
    const candidates = Array.from(remainingLocalFights.values()).filter(
      predicate,
    );
    if (candidates.length !== 1) return;

    const [candidate] = candidates;
    matchedLocalIds.set(officialIndex, candidate.id);
    remainingLocalFights.delete(candidate.id);
  };

  // Resolve exact pairs first so a fuzzy match can never consume a fight that
  // has an unambiguous official/local name match elsewhere on the card.
  officialFights.forEach((officialFight, officialIndex) => {
    const officialKey = matchupKey(
      officialFight.fighterA.name,
      officialFight.fighterB.name,
    );
    claimUniqueMatch(
      officialIndex,
      (localFight) =>
        matchupKey(localFight.fighter_a.name, localFight.fighter_b.name) ===
        officialKey,
    );
  });

  // UFC feeds occasionally omit middle names or suffixes. Accept a tolerant
  // fallback only when the whole matchup identifies one remaining local fight.
  officialFights.forEach((officialFight, officialIndex) => {
    if (matchedLocalIds.has(officialIndex)) return;
    claimUniqueMatch(officialIndex, (localFight) =>
      matchupNamesMatch(officialFight, localFight),
    );
  });

  return officialFights
    .map((fight, officialIndex) => ({
      ...fight,
      localFightId: matchedLocalIds.get(officialIndex) || null,
    }))
    .sort((a, b) => b.fightOrder - a.fightOrder);
}

export function buildOfficialLiveState(
  official: UfcLiveEvent,
  localFights: Array<
    Pick<FightWithFighters, "id" | "fighter_a" | "fighter_b">
  >,
): OfficialLiveState {
  const fights = mapOfficialFights(official.fights, localFights);
  const currentIndex = fights.findIndex((fight) => ACTIVE_PHASES.has(fight.phase));
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
    return buildOfficialLiveState(
      official,
      event.fights as FightWithFighters[],
    );
  } catch (error) {
    console.error("Failed to load official UFC live state", error);
    return null;
  }
}
