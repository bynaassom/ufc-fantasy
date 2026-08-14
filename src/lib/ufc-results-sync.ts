import { createHash } from "node:crypto";

export type SyncedResultMethod = "decision" | "submission" | "knockout";

export interface UfcStatsResult {
  winner: string;
  loser: string;
  method: SyncedResultMethod;
  round: number;
}

export interface UfcStatsCardFight {
  fighter_a_name: string;
  fighter_b_name: string;
}

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const NAME_SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv"]);
const UFC_STATS_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};
const BROWSER_CHALLENGE_TIMEOUT_MS = 8_000;
const MAX_BROWSER_CHALLENGE_ATTEMPTS = 10_000_000;

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

function extractSetCookies(headers: Headers) {
  const withGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies = withGetSetCookie.getSetCookie?.();
  if (setCookies?.length) return setCookies;

  const cookie = headers.get("set-cookie");
  return cookie ? [cookie] : [];
}

function cookieHeaderFromSetCookies(setCookies: string[]) {
  return setCookies
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

function mergeCookieHeaders(...headers: Array<string | null | undefined>) {
  const cookies = new Map<string, string>();

  for (const header of headers) {
    for (const cookie of (header || "").split(";")) {
      const trimmed = cookie.trim();
      if (!trimmed) continue;

      const eqIndex = trimmed.indexOf("=");
      if (eqIndex < 1) continue;
      cookies.set(trimmed.slice(0, eqIndex), trimmed);
    }
  }

  return Array.from(cookies.values()).join("; ");
}

function parseBrowserChallenge(html: string) {
  if (!/Checking your browser/i.test(html) || !/\/__c/.test(html)) return null;

  const nonce = html.match(/\bnonce\s*=\s*"([^"]+)"/)?.[1];
  const zeroCount = Number(
    html.match(/new Array\((\d+)\s*\+\s*1\)\.join\(['"]0['"]\)/)?.[1],
  );
  const path = html.match(
    /xhr\.open\(['"]POST['"],\s*["']([^"']+)["']/,
  )?.[1];

  if (!nonce || !zeroCount || !path) return null;
  return { nonce, zeroCount, path };
}

function solveBrowserChallenge(nonce: string, zeroCount: number) {
  const target = "0".repeat(zeroCount);
  const startTime = Date.now();

  for (let n = 0; n <= MAX_BROWSER_CHALLENGE_ATTEMPTS; n += 1) {
    if (Date.now() - startTime >= BROWSER_CHALLENGE_TIMEOUT_MS) {
      throw new Error("UFCStats browser challenge timed out");
    }
    const hash = createHash("sha256").update(`${nonce}:${n}`).digest("hex");
    if (hash.slice(0, zeroCount) === target) return n;
  }

  throw new Error("UFCStats browser challenge exceeded attempt limit");
}

async function fetchUfcStatsText(
  url: string,
  fetchImpl: FetchLike,
  cookieHeader?: string,
) {
  const headers = new Headers(UFC_STATS_HEADERS);
  if (cookieHeader) headers.set("Cookie", cookieHeader);

  const res = await fetchImpl(url, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`UFCStats HTTP ${res.status}`);

  return {
    html: await res.text(),
    cookieHeader: cookieHeaderFromSetCookies(extractSetCookies(res.headers)),
  };
}

export async function fetchUfcStatsHtml(
  url: string,
  fetchImpl: FetchLike = fetch,
) {
  const first = await fetchUfcStatsText(url, fetchImpl);
  const challenge = parseBrowserChallenge(first.html);
  if (!challenge) return first.html;

  const answer = solveBrowserChallenge(challenge.nonce, challenge.zeroCount);
  const challengeUrl = new URL(challenge.path, url).toString();
  const challengeHeaders = new Headers(UFC_STATS_HEADERS);
  challengeHeaders.set("Content-Type", "application/x-www-form-urlencoded");
  if (first.cookieHeader) challengeHeaders.set("Cookie", first.cookieHeader);

  const challengeRes = await fetchImpl(challengeUrl, {
    method: "POST",
    headers: challengeHeaders,
    body: new URLSearchParams({
      nonce: challenge.nonce,
      n: String(answer),
    }).toString(),
  });
  if (!challengeRes.ok) throw new Error(`UFCStats HTTP ${challengeRes.status}`);

  const verifiedCookieHeader = mergeCookieHeaders(
    first.cookieHeader,
    cookieHeaderFromSetCookies(extractSetCookies(challengeRes.headers)),
  );
  const verified = await fetchUfcStatsText(url, fetchImpl, verifiedCookieHeader);
  if (parseBrowserChallenge(verified.html)) {
    throw new Error("UFCStats browser challenge was not resolved");
  }

  return verified.html;
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

export function parseUfcStatsEventCard(html: string): UfcStatsCardFight[] {
  const fights: UfcStatsCardFight[] = [];
  const seen = new Set<string>();
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    if (!rowMatch[1].includes("fighter-details")) continue;
    const names = extractFighterNamesFromRow(rowMatch[1]);
    if (names.length < 2) continue;

    const key = names
      .slice(0, 2)
      .map((name) => tokenizeName(name).join(" "))
      .sort()
      .join("::");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    fights.push({ fighter_a_name: names[0], fighter_b_name: names[1] });
  }

  return fights;
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
