import {
  mapMethod,
  namesMatch,
  type SyncedResultMethod,
  type UfcStatsResult,
} from "@/lib/ufc-results-sync";

export type ResultSourceId =
  | "ufcstats"
  | "ufc"
  | "espn"
  | "sherdog"
  | "tapology";

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

const TRUSTED_SOURCE_IDS = new Set<ResultSourceId>([
  "ufcstats",
  "ufc",
  "espn",
  "sherdog",
]);

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
  if (!match) return null;
  return Number(match[1] || match[2]);
}

function normalizeKey(value: string) {
  return stripTags(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resultPairKey(result: UfcStatsResult) {
  return [normalizeKey(result.winner), normalizeKey(result.loser)].sort().join("::");
}

function dedupeResults(results: UfcStatsResult[]) {
  const seen = new Set<string>();
  const deduped: UfcStatsResult[] = [];

  for (const result of results) {
    const key = [
      resultPairKey(result),
      normalizeKey(result.winner),
      result.method,
      result.round,
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(result);
  }

  return deduped;
}

function findBlocksByClass(html: string, className: string) {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<[^>]+class=["'][^"']*\\b${escaped}\\b[^"']*["'][^>]*>`,
    "gi",
  );
  const positions = Array.from(html.matchAll(regex)).map((match) => match.index ?? 0);

  return positions.map((pos, index) =>
    html.slice(pos, positions[index + 1] ?? html.length),
  );
}

function firstTextByClasses(html: string, requiredClasses: string[]) {
  const tagRegex = /<([a-z0-9]+)\b[^>]*class=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    const classes = match[2].split(/\s+/);
    if (requiredClasses.every((className) => classes.includes(className))) {
      const endTag = new RegExp(`</${match[1]}>`, "i");
      const rest = html.slice(tagRegex.lastIndex);
      const endMatch = rest.match(endTag);
      return stripTags(rest.slice(0, endMatch?.index ?? undefined));
    }
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

function pushResult(
  results: UfcStatsResult[],
  winner: string,
  loser: string,
  methodRaw: string,
  roundRaw: string,
) {
  const method = mapMethod(methodRaw);
  const round = parseRound(roundRaw);

  if (!winner || !loser || !method || !round) return;
  results.push({ winner, loser, method, round });
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
    const method = firstTextByClasses(block, [
      "c-listing-fight__result-text",
      "method",
    ]);
    const round = firstTextByClasses(block, ["c-listing-fight__result-text", "round"]);

    if (hasWinOutcome(redSection) && hasLossOutcome(blueSection)) {
      pushResult(results, redName, blueName, method, round);
    } else if (hasWinOutcome(blueSection) && hasLossOutcome(redSection)) {
      pushResult(results, blueName, redName, method, round);
    }
  }

  return dedupeResults(results);
}

function extractJsonArrayAfterKey(html: string, key: string) {
  const keyIndex = html.indexOf(`"${key}"`);
  if (keyIndex < 0) return "";

  const colonIndex = html.indexOf(":", keyIndex);
  const start = html.indexOf("[", colonIndex);
  if (colonIndex < 0 || start < 0) return "";

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < html.length; index += 1) {
    const char = html[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;
      if (depth === 0) return html.slice(start, index + 1);
    }
  }

  return "";
}

function fighterNameFromEspnSide(side: any) {
  return (
    side?.dspNm ||
    side?.displayName ||
    side?.name ||
    side?.athlete?.displayName ||
    side?.athlete?.fullName ||
    ""
  );
}

function isEspnWinner(side: any) {
  return side?.isWin === true || side?.isWinner === true || side?.winner === true;
}

export function parseEspnFightCenterResults(html: string) {
  const rawCardSegs = extractJsonArrayAfterKey(html, "cardSegs");
  if (!rawCardSegs) return [];

  let cardSegs: any[];
  try {
    cardSegs = JSON.parse(rawCardSegs);
  } catch {
    return [];
  }

  const results: UfcStatsResult[] = [];
  for (const segment of cardSegs) {
    for (const match of segment?.mtchs || segment?.matches || []) {
      const away = match?.awy || match?.away || match?.competitors?.[0];
      const home = match?.hme || match?.home || match?.competitors?.[1];
      const awayName = fighterNameFromEspnSide(away);
      const homeName = fighterNameFromEspnSide(home);
      const methodRaw = [
        match?.dec?.shrtDspNm,
        match?.dec?.shortDisplayName,
        match?.dec?.dspNm,
        match?.dec?.displayName,
        match?.dec?.det,
        match?.decision?.displayName,
      ]
        .filter(Boolean)
        .join(" ");
      const roundRaw =
        match?.status?.rd ||
        match?.status?.period ||
        match?.status?.round ||
        match?.rd ||
        methodRaw;

      if (isEspnWinner(away) && homeName) {
        pushResult(results, awayName, homeName, methodRaw, String(roundRaw));
      } else if (isEspnWinner(home) && awayName) {
        pushResult(results, homeName, awayName, methodRaw, String(roundRaw));
      }
    }
  }

  return dedupeResults(results);
}

function extractFighterNamesFromLinks(html: string) {
  const names: string[] = [];
  const seen = new Set<string>();
  const regex =
    /<a\b[^>]*href=["'][^"']*(?:\/fighter\/|\/fightcenter\/fighters\/)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const name = stripTags(match[1]);
    const key = normalizeKey(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }

  return names;
}

function extractSherdogRowRound(rowHtml: string) {
  const winbyMatch = rowHtml.match(
    /<td\b[^>]*class=["'][^"']*\bwinby\b[^"']*["'][^>]*>[\s\S]*?<\/td>([\s\S]*)/i,
  );
  const afterWinby = winbyMatch?.[1] || rowHtml;
  const nextCells = Array.from(
    afterWinby.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi),
  ).map((match) => stripTags(match[1]));

  return nextCells.find((cell) => parseRound(cell)) || "";
}

function parseResultsFromSherdogBlock(block: string) {
  const names = extractFighterNamesFromLinks(block);
  const statuses = Array.from(
    block.matchAll(/final_result\s+(win|loss|draw|nc|no_contest)/gi),
  ).map((match) => match[1].toLowerCase());
  if (names.length < 2 || statuses.length < 2) return null;

  const winnerIndex = statuses.findIndex((status) => status === "win");
  const loserIndex = statuses.findIndex((status) => status === "loss");
  if (winnerIndex < 0 || loserIndex < 0 || !names[winnerIndex] || !names[loserIndex]) {
    return null;
  }

  const method =
    stripTags(
      block.match(
        /<td\b[^>]*class=["'][^"']*\bwinby\b[^"']*["'][^>]*>([\s\S]*?)<\/td>/i,
      )?.[1] || "",
    ) ||
    stripTags(block.match(/Method[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i)?.[1] || "");
  const round =
    extractSherdogRowRound(block) ||
    stripTags(block.match(/Round[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i)?.[1] || "");

  const methodMapped = mapMethod(method);
  const roundParsed = parseRound(round);
  if (!methodMapped || !roundParsed) return null;

  return {
    winner: names[winnerIndex],
    loser: names[loserIndex],
    method: methodMapped,
    round: roundParsed,
  };
}

export function parseSherdogEventResults(html: string) {
  const results: UfcStatsResult[] = [];
  const rowRegex = /<tr\b[^>]*itemprop=["']subEvent["'][^>]*>[\s\S]*?<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const result = parseResultsFromSherdogBlock(rowMatch[0]);
    if (result) results.push(result);
  }

  for (const block of findBlocksByClass(html, "fight_card")) {
    const result = parseResultsFromSherdogBlock(block);
    if (result) results.push(result);
  }

  return dedupeResults(results);
}

export function parseTapologyEventResults(html: string) {
  if (/Just a moment|cf-chl|cloudflare/i.test(html)) return [];

  const results: UfcStatsResult[] = [];
  const blocks = [
    ...findBlocksByClass(html, "fightCardBout"),
    ...findBlocksByClass(html, "fight-card-bout"),
  ];

  for (const block of blocks) {
    const names = extractFighterNamesFromLinks(block);
    if (names.length < 2) continue;

    const statuses = Array.from(
      block.matchAll(/bout-result[^"']*(win|loss)|result[^"']*(win|loss)/gi),
    ).map((match) => (match[1] || match[2] || "").toLowerCase());
    const winnerIndex = statuses.findIndex((status) => status === "win");
    const loserIndex = statuses.findIndex((status) => status === "loss");
    if (winnerIndex < 0 || loserIndex < 0) continue;

    const text = stripTags(block);
    pushResult(results, names[winnerIndex], names[loserIndex], text, text);
  }

  return dedupeResults(results);
}

function matchesFight(result: UfcStatsResult, fighterA: string, fighterB: string) {
  return (
    (namesMatch(result.winner, fighterA) || namesMatch(result.winner, fighterB)) &&
    (namesMatch(result.loser, fighterA) || namesMatch(result.loser, fighterB))
  );
}

function shouldConfirmSourceGroup(matches: MatchedSourceResult[], totalMatches: number) {
  const trustedMatches = matches.filter((match) => TRUSTED_SOURCE_IDS.has(match.source));
  if (matches.length >= 2 && trustedMatches.length >= 1) return true;

  if (
    totalMatches === 1 &&
    trustedMatches.length === 1 &&
    (trustedMatches[0].source === "ufcstats" || trustedMatches[0].source === "ufc")
  ) {
    return true;
  }

  return false;
}

function pickConfirmedSourceGroup(
  groups: Map<string, MatchedSourceResult[]>,
  totalMatches: number,
) {
  const sortedGroups = Array.from(groups.values()).sort(
    (a, b) => b.length - a.length,
  );
  const topGroup = sortedGroups[0];
  if (!topGroup) return null;

  const runnerUp = sortedGroups[1];
  const hasUniqueMajority = !runnerUp || topGroup.length > runnerUp.length;
  if (!hasUniqueMajority) return null;

  return shouldConfirmSourceGroup(topGroup, totalMatches) ? topGroup : null;
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

    const agreedMatches = pickConfirmedSourceGroup(groups, matches.length);

    if (!agreedMatches && groups.size > 1) {
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

    if (!agreedMatches) continue;

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
