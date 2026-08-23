import type { HomeFighterStats } from "@/types";
import { unstable_cache } from "next/cache";

const UFC_BASES = ["https://www.ufc.com.br", "https://www.ufc.com"];

export type UfcFighterStatsPayload = HomeFighterStats & {
  name: string;
  slug: string;
  physical: { height: string; weight: string; reach: string; legReach: string };
  striking: { slpm: string; sapm: string; strAcc: string; strDef: string };
  grappling: { tdAvg: string; tdAcc: string; tdDef: string; subAvg: string };
  other: { kdAvg: string; avgFightTime: string };
  wins_by: {
    ko: { count: string; pct: string };
    dec: { count: string; pct: string };
    sub: { count: string; pct: string };
  };
};

function toSlug(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

export function generateStatsSlugCandidates(slug: string, fighterName?: string | null) {
  const candidates = new Set<string>();
  if (slug) candidates.add(slug);
  if (fighterName?.trim()) {
    const base = toSlug(fighterName);
    const parts = base.split("-").filter(Boolean);
    candidates.add(base);
    const cleaned = base.replace(/-jr$|-sr$|-ii$|-iii$|-iv$/, "");
    if (cleaned) candidates.add(cleaned);
    if (parts.length >= 3) {
      candidates.add(`${parts[0]}-${parts[parts.length - 1]}`);
      candidates.add(`${parts[0]}-${parts.slice(1).join("-")}`);
    }
    if (parts.length === 2) candidates.add(`${parts[1]}-${parts[0]}`);
  }
  return [...candidates].filter(Boolean);
}

function decodeHtmlEntities(value: string) {
  return value.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function htmlToText(html: string) {
  return decodeHtmlEntities(html.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6|tr|td|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ").replace(/\r/g, "\n").replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n").trim());
}

function compactText(text: string) { return text.replace(/\s+/g, " ").trim(); }

function firstMatch(source: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "--";
}

function firstPair(source: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1] && match?.[2]) return { count: match[1].trim(), pct: match[2].trim() };
  }
  return { count: "--", pct: "0" };
}

function roundPercent(numerator: string, denominator: string) {
  const num = Number.parseFloat(numerator);
  const den = Number.parseFloat(denominator);
  if (!num || !den) return "--";
  return String(Math.round((num / den) * 100));
}

function inToCm(value: string) {
  const number = Number.parseFloat(value);
  return number ? `${(number * 2.54).toFixed(1)} cm` : "--";
}

function lbToKg(value: string) {
  const number = Number.parseFloat(value);
  return number ? `${(number * 0.453592).toFixed(1)} kg` : "--";
}

export function parseUfcFighterStats(html: string, requestedSlug: string, sourceUrl = ""): UfcFighterStatsPayload | null {
  const compact = compactText(htmlToText(html));
  const metaTitle = html.match(/property="og:title"\s+content="([^"]+)"/i)?.[1] ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "";
  const nameMatch = html.match(/<h1[^>]*>\s*([^<]+)\s*<\/h1>/i)?.[1] || metaTitle.replace(/\s*\|\s*UFC.*$/i, "").trim();
  const name = decodeHtmlEntities(nameMatch || requestedSlug).trim();
  const record = firstMatch(compact, [/([0-9]+-[0-9]+-[0-9]+)\s*\((?:V-D-E|W-L-D)\)/i]);
  const sigLanded = firstMatch(compact, [/Golpes Sig\. Conectados\s+([0-9]+)/i, /Significant Strikes Landed\s+([0-9]+)/i]);
  const sigAttempted = firstMatch(compact, [/Golpes Sig\. Desferidos\s+([0-9]+)/i, /Significant Strikes Attempted\s+([0-9]+)/i]);
  const takedownsLanded = firstMatch(compact, [/Quedas aplicadas\s+([0-9]+)/i, /Takedowns Landed\s+([0-9]+)/i]);
  const takedownsAttempted = firstMatch(compact, [/Tentativas de queda\s+([0-9]+)/i, /Takedowns Attempted\s+([0-9]+)/i]);
  const strAcc = firstMatch(compact, [/Precis[aã]o de striking\s+([0-9]+)%/i, /Sig\.? Str\.? Accuracy\s+([0-9]+)%/i]);
  const tdAcc = firstMatch(compact, [/Precis[aã]o De Quedas\s+([0-9]+)%/i, /Takedown Accuracy\s+([0-9]+)%/i]);
  const ko = firstPair(compact, [/KO\/TKO\s+([0-9]+)\s+\(([0-9]+)%\)/i]);
  const dec = firstPair(compact, [/DEC\s+([0-9]+)\s+\(([0-9]+)%\)/i]);
  const sub = firstPair(compact, [/FIN\s+([0-9]+)\s+\(([0-9]+)%\)/i, /SUB\s+([0-9]+)\s+\(([0-9]+)%\)/i]);
  const firstRoundRaw = firstMatch(compact, [
    /Vit[oó]rias\s+no\s+1[º°o]\s+round\s+([0-9]+)/i,
    /First Round Wins\s+([0-9]+)/i,
    /1st Round Wins\s+([0-9]+)/i,
  ]);
  const heightRaw = firstMatch(compact, [/Altura\s+([\d.]+)/i, /Height\s+([\d.]+)/i]);
  const weightRaw = firstMatch(compact, [/Peso\s+([\d.]+)/i, /Weight\s+([\d.]+)/i]);
  const reachRaw = firstMatch(compact, [/Envergadura\s+([\d.]+)/i, /Reach\s+([\d.]+)/i]);
  const legRaw = firstMatch(compact, [/Alcance das pernas\s+([\d.]+)/i, /Leg Reach\s+([\d.]+)/i]);
  const slpm = firstMatch(compact, [/([\d.]+)\s+Golpes Sig\. Conectados\s+Por Minuto/i, /([\d.]+)\s+Significant Strikes Landed\s+Per Minute/i]);
  const sapm = firstMatch(compact, [/([\d.]+)\s+Golpes Sig\. Absorvidos\s+Por Minuto/i, /([\d.]+)\s+Significant Strikes Absorbed\s+Per Minute/i]);
  const tdAvg = firstMatch(compact, [/([\d.]+)\s+M[eé]dia de quedas\s+Por 15 Min/i, /([\d.]+)\s+Takedown Avg\s+Per 15 Min/i]);
  const subAvg = firstMatch(compact, [/([\d.]+)\s+M[eé]dia de finaliza[cç][õo]es\s+Por 15 Min/i, /([\d.]+)\s+Submission Avg\s+Per 15 Min/i]);
  const strDef = firstMatch(compact, [/([0-9]+)%\s+Defesa de Golpes Sig\./i, /([0-9]+)%\s+Sig\.? Str\.? Defense/i]);
  const tdDef = firstMatch(compact, [/([0-9]+)%\s+Defesa De Quedas/i, /([0-9]+)%\s+Takedown Defense/i]);
  const kdAvg = firstMatch(compact, [/([\d.]+)\s+M[eé]dia de Knockdowns/i, /([\d.]+)\s+Knockdown Avg/i]);
  const avgFightTime = firstMatch(compact, [/([0-9:]+)\s+Tempo m[eé]dio de luta/i, /([0-9:]+)\s+Average Fight Time/i]);
  const hasEnoughData = record !== "--" || ko.count !== "--" || slpm !== "--" || heightRaw !== "--";
  if (!hasEnoughData) return null;
  return {
    name, slug: requestedSlug, sourceUrl, record: record === "--" ? null : record,
    winsByKoTko: ko.count === "--" ? null : Number(ko.count),
    winsBySubmission: sub.count === "--" ? null : Number(sub.count),
    firstRoundWins: firstRoundRaw === "--" ? null : Number(firstRoundRaw),
    physical: { height: heightRaw === "--" ? "--" : inToCm(heightRaw), weight: weightRaw === "--" ? "--" : lbToKg(weightRaw), reach: reachRaw === "--" ? "--" : inToCm(reachRaw), legReach: legRaw === "--" ? "--" : inToCm(legRaw) },
    striking: { slpm, sapm, strAcc: strAcc === "--" ? roundPercent(sigLanded, sigAttempted) : strAcc, strDef },
    grappling: { tdAvg, tdAcc: tdAcc === "--" ? roundPercent(takedownsLanded, takedownsAttempted) : tdAcc, tdDef, subAvg },
    other: { kdAvg, avgFightTime }, wins_by: { ko, dec, sub },
  };
}

async function fetchAthletePage(slug: string, base: string, timeoutMs: number) {
  const response = await fetch(`${base}/athlete/${slug}`, {
    headers: { "User-Agent": "Mozilla/5.0 UFC Fantasy", Accept: "text/html,application/xhtml+xml", "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8" },
    signal: AbortSignal.timeout(Math.max(1, timeoutMs)),
    next: { revalidate: 21600 },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { html: await response.text(), url: `${base}/athlete/${slug}` };
}

function getCachedAthletePage(slug: string, base: string, timeoutMs: number) {
  return unstable_cache(
    () => fetchAthletePage(slug, base, timeoutMs),
    ["ufc-fighter-page", base, slug],
    { revalidate: 21_600 },
  )();
}

export async function fetchUfcFighterStats({
  slug,
  name,
  totalTimeoutMs = 10_000,
}: {
  slug?: string | null;
  name: string;
  totalTimeoutMs?: number;
}): Promise<UfcFighterStatsPayload | null> {
  const deadline = Date.now() + Math.max(1, totalTimeoutMs);
  for (const candidate of generateStatsSlugCandidates(slug || "", name)) {
    for (const base of UFC_BASES) {
      try {
        const remainingMs = deadline - Date.now();
        if (remainingMs <= 0) return null;
        const page = await getCachedAthletePage(candidate, base, Math.min(10_000, remainingMs));
        const parsed = parseUfcFighterStats(page.html, candidate, page.url);
        if (parsed) return parsed;
      } catch {
        // External source is best effort; the home must still render.
      }
    }
  }
  return null;
}

export function toHomeFighterStats(payload: UfcFighterStatsPayload | null): HomeFighterStats | null {
  if (!payload) return null;
  return { record: payload.record, winsByKoTko: payload.winsByKoTko, winsBySubmission: payload.winsBySubmission, firstRoundWins: payload.firstRoundWins, sourceUrl: payload.sourceUrl };
}
