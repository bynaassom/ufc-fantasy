export type SyncedResultMethod = "decision" | "submission" | "knockout";

export interface UfcStatsResult {
  winner: string;
  loser: string;
  method: SyncedResultMethod;
  round: number;
}

const NAME_SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv"]);

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

function tokenizeName(name: string) {
  return decodeHtml(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’.]/g, "")
    .replace(/[^a-z\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((token) => token && !NAME_SUFFIXES.has(token));
}

export function namesMatch(a: string, b: string) {
  const tokensA = tokenizeName(a);
  const tokensB = tokenizeName(b);

  if (!tokensA.length || !tokensB.length) return false;
  if (tokensA.join(" ") === tokensB.join(" ")) return true;

  const firstA = tokensA[0];
  const firstB = tokensB[0];
  const lastA = tokensA[tokensA.length - 1];
  const lastB = tokensB[tokensB.length - 1];

  if (firstA === firstB && lastA === lastB) return true;
  if (lastA === lastB && firstA[0] === firstB[0]) return true;

  const surnameA = tokensA.slice(-2).join(" ");
  const surnameB = tokensB.slice(-2).join(" ");
  if (surnameA && surnameA === surnameB && firstA[0] === firstB[0]) return true;

  return false;
}

export function mapMethod(raw: string): SyncedResultMethod | null {
  const normalized = stripTags(raw).toLowerCase().replace(/\s+/g, " ");

  if (normalized.includes("dec")) return "decision";
  if (
    normalized.includes("sub") ||
    normalized.includes("choke") ||
    normalized.includes("lock") ||
    normalized.includes("triangle") ||
    normalized.includes("armbar") ||
    normalized.includes("rear naked") ||
    normalized.includes("kimura") ||
    normalized.includes("guillotine")
  ) {
    return "submission";
  }
  if (
    normalized.includes("ko") ||
    normalized.includes("tko") ||
    normalized.includes("doctor stoppage") ||
    normalized.includes("corner stoppage") ||
    normalized.includes("retirement")
  ) {
    return "knockout";
  }

  return null;
}

function parseRound(raw: string) {
  const match = stripTags(raw).match(/\b([1-5])\b/);
  if (!match) return null;
  return Number(match[1]);
}

function extractFighterNamesFromRow(rowHtml: string) {
  const fighterNames: string[] = [];
  const anchorRegex =
    /<a[^>]*href="[^"]*fighter-details[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;

  let anchorMatch;
  while ((anchorMatch = anchorRegex.exec(rowHtml)) !== null) {
    const name = stripTags(anchorMatch[1]);
    if (name) fighterNames.push(name);
  }

  return fighterNames;
}

function parseResultsFromHtmlTable(html: string) {
  const results: UfcStatsResult[] = [];
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    if (!rowHtml.includes("fighter-details")) continue;

    const fighterNames = extractFighterNamesFromRow(rowHtml);
    if (fighterNames.length < 2) continue;

    const cells = Array.from(rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map(
      (match) => stripTags(match[1]),
    );
    if (!cells.length) continue;

    const rowText = cells.join(" ");
    if (/view matchup/i.test(rowText)) continue;

    const methodCell = cells.at(-3) || "";
    const roundCell = cells.at(-2) || "";
    const method = mapMethod(methodCell);
    const round = parseRound(roundCell);

    if (!method || !round) continue;

    results.push({
      winner: fighterNames[0],
      loser: fighterNames[1],
      method,
      round,
    });
  }

  return results;
}

function parseResultsFromMarkdown(html: string) {
  const results: UfcStatsResult[] = [];

  for (const line of html.split("\n")) {
    const cols = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
    if (cols.length < 9) continue;

    const method = mapMethod(cols.at(-3) || "");
    const round = parseRound(cols.at(-2) || "");
    if (!method || !round) continue;

    const fighterCol = (cols[1] || "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    const names = fighterCol
      .split(/\n|\s{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (names.length < 2) continue;

    results.push({
      winner: names[0],
      loser: names[1],
      method,
      round,
    });
  }

  return results;
}

export function parseUfcStatsEventResults(html: string) {
  const tableResults = parseResultsFromHtmlTable(html);
  if (tableResults.length > 0) return tableResults;
  return parseResultsFromMarkdown(html);
}
