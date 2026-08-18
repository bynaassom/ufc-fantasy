import {
  extractUfcFightId,
  fetchUfcFightOdds,
  type UfcFightOdds,
} from "@/lib/ufc-fight-odds";
import { scrapeUfcEventCard } from "@/lib/ufc-card-sync";
import { fetchUfcLiveEventFromPage } from "@/lib/ufc-live-api";
import { namesMatch } from "@/lib/ufc-results-sync";
import type { DbClient } from "@/types/database";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/server/cache-tags";

type EventFight = {
  id: string;
  odds_a?: string | null;
  odds_b?: string | null;
  ufc_matchup_url?: string | null;
  fighter_a?: { name?: string | null } | Array<{ name?: string | null }> | null;
  fighter_b?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

export type UfcOddsMatch = {
  fight_id: string;
  fight_id_ufc: string;
  event_name: string;
  fight_label: string;
  bookmaker: "UFC.com";
  source_url: string;
  current_odds_a: string | null;
  current_odds_b: string | null;
  next_odds_a: string;
  next_odds_b: string;
  changed: boolean;
};

export type UfcOddsSkipped = {
  fight_id: string;
  event_name: string;
  fight_label: string;
  reason: string;
};

type OfficialFightSides = {
  redName: string;
  blueName: string;
};

function relationName(
  relation: EventFight["fighter_a"] | EventFight["fighter_b"],
) {
  return Array.isArray(relation) ? relation[0]?.name || "" : relation?.name || "";
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await mapper(values[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker()),
  );
  return results;
}

function getEventPageUrl(fights: EventFight[]) {
  for (const fight of fights) {
    if (!fight.ufc_matchup_url) continue;
    try {
      const url = new URL(fight.ufc_matchup_url);
      if (!/\/event\/[^/]+/i.test(url.pathname)) continue;
      url.hash = "";
      url.search = "";
      return url.toString().replace(/\/$/, "");
    } catch {
      // Tenta o próximo link de luta.
    }
  }
  return null;
}

async function getOfficialFightSides(fights: EventFight[]) {
  const eventUrl = getEventPageUrl(fights);
  const sides = new Map<string, OfficialFightSides>();
  if (!eventUrl) return sides;

  try {
    const official = await fetchUfcLiveEventFromPage(eventUrl);
    for (const fight of official.event.fights) {
      sides.set(fight.fightId, {
        redName: fight.fighterA.name,
        blueName: fight.fighterB.name,
      });
    }
    if (sides.size) return sides;
  } catch {
    // Alguns eventos ainda não expõem a API live; usa o card HTML abaixo.
  }

  try {
    const scraped = await scrapeUfcEventCard(eventUrl);
    for (const fight of scraped) {
      if (!/^\d+$/.test(fight.fmid)) continue;
      sides.set(fight.fmid, {
        redName: fight.fighter_a.name,
        blueName: fight.fighter_b.name,
      });
    }
  } catch {
    // O fragmento com FightId ainda permite sincronizar cards canônicos A=red/B=blue.
  }

  return sides;
}

export function mapUfcOddsToLocalFighters(
  odds: UfcFightOdds,
  local: { fighterAName: string; fighterBName: string },
  official?: OfficialFightSides,
) {
  if (!odds.red || !odds.blue) return null;
  if (!official) return { oddsA: odds.red, oddsB: odds.blue };

  const sameOrder =
    namesMatch(local.fighterAName, official.redName) &&
    namesMatch(local.fighterBName, official.blueName);
  if (sameOrder) return { oddsA: odds.red, oddsB: odds.blue };

  const reversedOrder =
    namesMatch(local.fighterAName, official.blueName) &&
    namesMatch(local.fighterBName, official.redName);
  if (reversedOrder) return { oddsA: odds.blue, oddsB: odds.red };

  return null;
}

export async function buildUfcOddsPreviewForEvent(
  client: DbClient,
  event: { id: string; name: string },
) {
  const { data, error } = await client
    .from("fights")
    .select(
      `id, odds_a, odds_b, ufc_matchup_url,
      fighter_a:fighters!fighter_a_id(name),
      fighter_b:fighters!fighter_b_id(name)`,
    )
    .eq("event_id", event.id);

  if (error) throw new Error(error.message);

  const fights = (data || []) as EventFight[];
  const officialSides = await getOfficialFightSides(fights);
  const matches: UfcOddsMatch[] = [];
  const skipped: UfcOddsSkipped[] = [];
  const fetchable: Array<{
    fight: EventFight;
    fightId: string;
    fighterAName: string;
    fighterBName: string;
  }> = [];

  for (const fight of fights) {
    const fighterAName = relationName(fight.fighter_a);
    const fighterBName = relationName(fight.fighter_b);
    const fightLabel = `${fighterAName || "?"} vs ${fighterBName || "?"}`;
    const fightId = extractUfcFightId(fight.ufc_matchup_url);

    if (!fighterAName || !fighterBName) {
      skipped.push({
        fight_id: fight.id,
        event_name: event.name,
        fight_label: fightLabel,
        reason: "Lutadores incompletos na base",
      });
      continue;
    }

    if (!fightId) {
      skipped.push({
        fight_id: fight.id,
        event_name: event.name,
        fight_label: fightLabel,
        reason: "FightId da UFC não encontrado no link da luta",
      });
      continue;
    }

    fetchable.push({ fight, fightId, fighterAName, fighterBName });
  }

  const fetched = await mapWithConcurrency(fetchable, 6, async (item) => {
    try {
      return { item, odds: await fetchUfcFightOdds(item.fightId), error: null };
    } catch (error) {
      return {
        item,
        odds: null,
        error: error instanceof Error ? error.message : "Falha ao consultar UFC.com",
      };
    }
  });

  for (const result of fetched) {
    const { fight, fightId, fighterAName, fighterBName } = result.item;
    const fightLabel = `${fighterAName} vs ${fighterBName}`;

    if (result.error) {
      skipped.push({
        fight_id: fight.id,
        event_name: event.name,
        fight_label: fightLabel,
        reason: result.error,
      });
      continue;
    }

    const odds = result.odds as UfcFightOdds;
    if (!odds.red || !odds.blue) {
      skipped.push({
        fight_id: fight.id,
        event_name: event.name,
        fight_label: fightLabel,
        reason: "Odds ainda não publicadas pelo UFC",
      });
      continue;
    }

    const mappedOdds = mapUfcOddsToLocalFighters(
      odds,
      { fighterAName, fighterBName },
      officialSides.get(fightId),
    );
    if (!mappedOdds) {
      skipped.push({
        fight_id: fight.id,
        event_name: event.name,
        fight_label: fightLabel,
        reason: "Lutadores locais não conferem com os cantos oficiais do UFC",
      });
      continue;
    }

    const currentOddsA = fight.odds_a || null;
    const currentOddsB = fight.odds_b || null;
    matches.push({
      fight_id: fight.id,
      fight_id_ufc: fightId,
      event_name: event.name,
      fight_label: fightLabel,
      bookmaker: "UFC.com",
      source_url: odds.url,
      current_odds_a: currentOddsA,
      current_odds_b: currentOddsB,
      next_odds_a: mappedOdds.oddsA,
      next_odds_b: mappedOdds.oddsB,
      changed:
        currentOddsA !== mappedOdds.oddsA || currentOddsB !== mappedOdds.oddsB,
    });
  }

  return { matches, skipped };
}

export async function syncUfcOddsForEvent(
  client: DbClient,
  event: { id: string; name: string },
  options: { dryRun?: boolean } = {},
) {
  const preview = await buildUfcOddsPreviewForEvent(client, event);
  const changedMatches = preview.matches.filter((match) => match.changed);
  let saved = 0;

  if (!options.dryRun) {
    for (const match of changedMatches) {
      const { error } = await client
        .from("fights")
        .update({ odds_a: match.next_odds_a, odds_b: match.next_odds_b })
        .eq("id", match.fight_id);
      if (error) throw new Error(error.message);
      saved += 1;
    }
    if (saved > 0) revalidateTag(CACHE_TAGS.events, "max");
  }

  return { ...preview, changed_count: changedMatches.length, saved_count: saved };
}
