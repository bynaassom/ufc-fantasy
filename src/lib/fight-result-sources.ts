import {
  mapMethod,
  namesMatch,
  type SyncedResultMethod,
  type UfcStatsResult,
} from "@/lib/ufc-results-sync";

export type ResultSourceId = "ufcstats" | "ufc";

export interface ResultSourceSet {
  source: ResultSourceId;
  label: string;
  url?: string | null;
  results: UfcStatsResult[];
  error?: string | null;
}

export interface ConsensusFightInput {
  id: string;
  result_confirmed?: boolean | null;
  event?: { slug?: string | null } | null;
  fighter_a?: { id?: string | null; name?: string | null } | null;
  fighter_b?: { id?: string | null; name?: string | null } | null;
}

export interface ConsensusUpdate {
  fight_id: string;
  winner_id: string;
  method: SyncedResultMethod;
  round: number;
  label: string;
  eventSlug: string | undefined;
  sources: ResultSourceId[];
  sourceLabels: string[];
}

export interface ResultConflict {
  fight_id: string;
  label: string;
  sources: ResultSourceId[];
  sourceLabels: string[];
  details: string[];
}

export interface ResultConsensus {
  updates: ConsensusUpdate[];
  conflicts: ResultConflict[];
}

type MatchedSourceResult = {
  source: ResultSourceId;
  label: string;
  winner_id: string;
  winnerName: string;
  method: SyncedResultMethod;
  round: number;
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

function parseRound(raw: string) {
  const match = stripTags(raw).match(/\bR(?:ound)?\s*([1-5])\b|\b([1-5])\b/i);
  return match ? Number(match[1] || match[2]) : null;
}

function normalizeKey(value: string) {
  return stripTags(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dedupeResults(results: UfcStatsResult[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = [
      normalizeKey(result.winner),
      normalizeKey(result.loser),
      result.method,
      result.round,
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findBlocksByClass(html: string, className: string) {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<[^>]+class=["'][^"']*\\b${escaped}\\b[^"']*["'][^>]*>`,
    "gi",
  );
  const positions = Array.from(html.matchAll(regex)).map((match) => match.index ?? 0);
  return positions.map((position, index) =>
    html.slice(position, positions[index + 1] ?? html.length),
  );
}

function firstTextByClasses(html: string, requiredClasses: string[]) {
  const tagRegex = /<([a-z0-9]+)\b[^>]*class=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    const classes = match[2].split(/\s+/);
    if (!requiredClasses.every((className) => classes.includes(className))) continue;

    const rest = html.slice(tagRegex.lastIndex);
    const endMatch = rest.match(new RegExp(`</${match[1]}>`, "i"));
    return stripTags(rest.slice(0, endMatch?.index ?? undefined));
  }

  return "";
}

function sectionAfterClass(html: string, className: string) {
  const index = html.indexOf(className);
  if (index < 0) return "";
  const nextCorner = html.indexOf("c-listing-fight__corner--", index + className.length);
  return html.slice(index, nextCorner > index ? nextCorner : undefined);
}

function hasWinOutcome(html: string) {
  return /(?:final_result|outcome|result)[^"']*\bwin\b|(?:--win|result-win)/i.test(html);
}

function hasLossOutcome(html: string) {
  return /(?:final_result|outcome|result)[^"']*\bloss\b|(?:--loss|result-loss)/i.test(html);
}

export function parseUfcOfficialEventResults(html: string) {
  const results: UfcStatsResult[] = [];

  for (const block of findBlocksByClass(html, "c-listing-fight")) {
    const redSection = sectionAfterClass(block, "c-listing-fight__corner--red");
    const blueSection = sectionAfterClass(block, "c-listing-fight__corner--blue");
    const redName =
      firstTextByClasses(redSection, ["c-listing-fight__corner-name--red"]) ||
      firstTextByClasses(block, ["details-content__name--red"]);
    const blueName =
      firstTextByClasses(blueSection, ["c-listing-fight__corner-name--blue"]) ||
      firstTextByClasses(block, ["details-content__name--blue"]);
    const method = mapMethod(
      firstTextByClasses(block, ["c-listing-fight__result-text", "method"]),
    );
    const round = parseRound(
      firstTextByClasses(block, ["c-listing-fight__result-text", "round"]),
    );
    if (!method || !round) continue;

    if (hasWinOutcome(redSection) && hasLossOutcome(blueSection)) {
      results.push({ winner: redName, loser: blueName, method, round });
    } else if (hasWinOutcome(blueSection) && hasLossOutcome(redSection)) {
      results.push({ winner: blueName, loser: redName, method, round });
    }
  }

  return dedupeResults(results.filter((result) => result.winner && result.loser));
}

function matchesFight(result: UfcStatsResult, fighterA: string, fighterB: string) {
  return (
    (namesMatch(result.winner, fighterA) || namesMatch(result.winner, fighterB)) &&
    (namesMatch(result.loser, fighterA) || namesMatch(result.loser, fighterB))
  );
}

export function buildResultConsensusUpdates(
  fights: ConsensusFightInput[],
  sourceSets: ResultSourceSet[],
): ResultConsensus {
  const updates: ConsensusUpdate[] = [];
  const conflicts: ResultConflict[] = [];

  for (const fight of fights) {
    if (fight.result_confirmed) continue;

    const fighterA = fight.fighter_a?.name || "";
    const fighterB = fight.fighter_b?.name || "";
    const fighterAId = fight.fighter_a?.id || "";
    const fighterBId = fight.fighter_b?.id || "";
    if (!fighterA || !fighterB || !fighterAId || !fighterBId) continue;

    const matches: MatchedSourceResult[] = [];
    for (const sourceSet of sourceSets) {
      const result = sourceSet.results.find((candidate) =>
        matchesFight(candidate, fighterA, fighterB),
      );
      if (!result) continue;

      const winnerIsA = namesMatch(result.winner, fighterA);
      const winnerIsB = namesMatch(result.winner, fighterB);
      if (!winnerIsA && !winnerIsB) continue;

      matches.push({
        source: sourceSet.source,
        label: sourceSet.label,
        winner_id: winnerIsA ? fighterAId : fighterBId,
        winnerName: winnerIsA ? fighterA : fighterB,
        method: result.method,
        round: result.round,
      });
    }
    if (!matches.length) continue;

    const groups = new Map<string, MatchedSourceResult[]>();
    for (const match of matches) {
      const key = `${match.winner_id}|${match.method}|${match.round}`;
      groups.set(key, [...(groups.get(key) || []), match]);
    }

    if (groups.size > 1) {
      conflicts.push({
        fight_id: fight.id,
        label: `${fighterA} vs ${fighterB}`,
        sources: matches.map((match) => match.source),
        sourceLabels: matches.map((match) => match.label),
        details: matches.map(
          (match) =>
            `${match.label}: ${match.winnerName} (${match.method}, R${match.round})`,
        ),
      });
      continue;
    }

    const agreedMatches = Array.from(groups.values())[0];
    const agreed = agreedMatches[0];
    updates.push({
      fight_id: fight.id,
      winner_id: agreed.winner_id,
      method: agreed.method,
      round: agreed.round,
      sources: agreedMatches.map((match) => match.source),
      sourceLabels: agreedMatches.map((match) => match.label),
      label: `${fighterA} vs ${fighterB} -> ${agreed.winnerName} (${agreed.method}, R${agreed.round}) [${agreedMatches
        .map((match) => match.label)
        .join(" + ")}]`,
      eventSlug: fight.event?.slug || undefined,
    });
  }

  return { updates, conflicts };
}
