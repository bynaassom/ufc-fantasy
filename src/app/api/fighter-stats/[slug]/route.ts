import { NextRequest, NextResponse } from "next/server";

function inToCm(val: string): string {
  const n = parseFloat(val);
  if (!n) return "--";
  return `${(n * 2.54).toFixed(1)} cm`;
}

function lbToKg(val: string): string {
  const n = parseFloat(val);
  if (!n) return "--";
  return `${(n * 0.453592).toFixed(1)} kg`;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function generateSlugCandidates(slug: string, fighterName?: string | null) {
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

    if (parts.length === 2) {
      candidates.add(`${parts[1]}-${parts[0]}`);
    }
  }

  return Array.from(candidates).filter(Boolean);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(
        /<\/(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6|tr|td|br)>/gi,
        "\n",
      )
      .replace(/<[^>]+>/g, " ")
      .replace(/\r/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{2,}/g, "\n")
      .trim(),
  );
}

function compactText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function firstMatch(source: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "--";
}

function firstPair(
  source: string,
  patterns: RegExp[],
): { count: string; pct: string } {
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1] && match?.[2]) {
      return { count: match[1].trim(), pct: match[2].trim() };
    }
  }
  return { count: "--", pct: "0" };
}

function roundPercent(numerator: string, denominator: string): string {
  const num = parseFloat(numerator);
  const den = parseFloat(denominator);
  if (!num || !den) return "--";
  return String(Math.round((num / den) * 100));
}

function parseStats(html: string, requestedSlug: string) {
  const text = htmlToText(html);
  const compact = compactText(text);

  const metaTitle =
    html.match(/property="og:title"\s+content="([^"]+)"/i)?.[1] ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ||
    "";

  const nameMatch =
    html.match(/<h1[^>]*>\s*([^<]+)\s*<\/h1>/i)?.[1] ||
    metaTitle.replace(/\s*\|\s*UFC.*$/i, "").trim();

  const name = decodeHtmlEntities(nameMatch || requestedSlug).trim();
  const record = firstMatch(compact, [/(\d+-\d+-\d+)\s*\((?:V-D-E|W-L-D)\)/i]);

  const sigLanded = firstMatch(compact, [
    /Golpes Sig\. Conectados\s+(\d+)/i,
    /Sig(?:nificant)?\.? Strikes Landed\s+(\d+)/i,
  ]);
  const sigAttempted = firstMatch(compact, [
    /Golpes Sig\. Desferidos\s+(\d+)/i,
    /Sig(?:nificant)?\.? Strikes Attempted\s+(\d+)/i,
  ]);

  const takedownsLanded = firstMatch(compact, [
    /Quedas aplicadas\s+(\d+)/i,
    /Takedowns Landed\s+(\d+)/i,
  ]);
  const takedownsAttempted = firstMatch(compact, [
    /Tentativas de queda\s+(\d+)/i,
    /Takedowns Attempted\s+(\d+)/i,
  ]);

  const slpm = firstMatch(compact, [
    /(\d+(?:\.\d+)?)\s+Golpes Sig\. Conectados\s+Por Minuto/i,
    /(\d+(?:\.\d+)?)\s+Significant Strikes Landed\s+Per Minute/i,
  ]);
  const sapm = firstMatch(compact, [
    /(\d+(?:\.\d+)?)\s+Golpes Sig\. Absorvidos\s+Por Minuto/i,
    /(\d+(?:\.\d+)?)\s+Significant Strikes Absorbed\s+Per Minute/i,
  ]);

  const strAcc =
    firstMatch(compact, [
      /Precis[aã]o de striking\s+(\d+)%/i,
      /Sig\.? Str\.? Accuracy\s+(\d+)%/i,
    ]) || "--";

  const tdAcc =
    firstMatch(compact, [
      /Precis[aã]o De Quedas\s+(\d+)%/i,
      /Takedown Accuracy\s+(\d+)%/i,
    ]) || "--";

  const strDef = firstMatch(compact, [
    /(\d+)\s*%\s+Defesa de Golpes Sig\./i,
    /(\d+)\s*%\s+Sig\.? Str\.? Defense/i,
  ]);
  const tdDef = firstMatch(compact, [
    /(\d+)\s*%\s+Defesa De Quedas/i,
    /(\d+)\s*%\s+Takedown Defense/i,
  ]);

  const tdAvg = firstMatch(compact, [
    /(\d+(?:\.\d+)?)\s+M[eé]dia de quedas\s+Por 15 Min/i,
    /(\d+(?:\.\d+)?)\s+Takedown Avg\s+Per 15 Min/i,
  ]);
  const subAvg = firstMatch(compact, [
    /(\d+(?:\.\d+)?)\s+M[eé]dia de finaliza[cç][õo]es\s+Por 15 Min/i,
    /(\d+(?:\.\d+)?)\s+Submission Avg\s+Per 15 Min/i,
  ]);
  const kdAvg = firstMatch(compact, [
    /(\d+(?:\.\d+)?)\s+M[eé]dia de Knockdowns/i,
    /(\d+(?:\.\d+)?)\s+Knockdown Avg/i,
  ]);
  const avgFightTime = firstMatch(compact, [
    /(\d+:\d+)\s+Tempo m[eé]dio de luta/i,
    /(\d+:\d+)\s+Average Fight Time/i,
  ]);

  const ko = firstPair(compact, [/KO\/TKO\s+(\d+)\s+\((\d+)%\)/i]);
  const dec = firstPair(compact, [/DEC\s+(\d+)\s+\((\d+)%\)/i]);
  const sub = firstPair(compact, [
    /FIN\s+(\d+)\s+\((\d+)%\)/i,
    /SUB\s+(\d+)\s+\((\d+)%\)/i,
  ]);

  const heightRaw = firstMatch(compact, [
    /Altura\s+([\d.]+)/i,
    /Height\s+([\d.]+)/i,
  ]);
  const weightRaw = firstMatch(compact, [
    /Peso\s+([\d.]+)/i,
    /Weight\s+([\d.]+)/i,
  ]);
  const reachRaw = firstMatch(compact, [
    /Envergadura\s+([\d.]+)/i,
    /Reach\s+([\d.]+)/i,
  ]);
  const legRaw = firstMatch(compact, [
    /Alcance das pernas\s+([\d.]+)/i,
    /Leg Reach\s+([\d.]+)/i,
  ]);

  const resolvedStrAcc =
    strAcc !== "--" ? strAcc : roundPercent(sigLanded, sigAttempted);
  const resolvedTdAcc =
    tdAcc !== "--" ? tdAcc : roundPercent(takedownsLanded, takedownsAttempted);

  const hasEnoughData =
    record !== "--" ||
    slpm !== "--" ||
    sapm !== "--" ||
    heightRaw !== "--" ||
    ko.count !== "--";

  return {
    hasEnoughData,
    payload: {
      name: name || requestedSlug,
      slug: requestedSlug,
      record,
      physical: {
        height: heightRaw !== "--" ? inToCm(heightRaw) : "--",
        weight: weightRaw !== "--" ? lbToKg(weightRaw) : "--",
        reach: reachRaw !== "--" ? inToCm(reachRaw) : "--",
        legReach: legRaw !== "--" ? inToCm(legRaw) : "--",
      },
      striking: {
        slpm,
        sapm,
        strAcc: resolvedStrAcc,
        strDef,
      },
      grappling: {
        tdAvg,
        tdAcc: resolvedTdAcc,
        tdDef,
        subAvg,
      },
      other: { kdAvg, avgFightTime },
      wins_by: { ko, dec, sub },
    },
  };
}

async function fetchAthletePage(slug: string) {
  const res = await fetch(`https://www.ufc.com.br/athlete/${slug}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.text();
}

export async function GET(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { slug } = params;
  const fighterName = req.nextUrl.searchParams.get("name");

  if (!slug) {
    return NextResponse.json({ error: "Slug obrigatório" }, { status: 400 });
  }

  const candidates = generateSlugCandidates(slug, fighterName);
  let lastError = "Falha ao buscar atleta";

  for (const candidate of candidates) {
    try {
      const html = await fetchAthletePage(candidate);
      const parsed = parseStats(html, candidate);

      if (!parsed.hasEnoughData) {
        lastError = "Página carregada, mas sem estatísticas reconhecíveis";
        continue;
      }

      return NextResponse.json(parsed.payload);
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Erro desconhecido";
    }
  }

  return NextResponse.json({ error: lastError }, { status: 502 });
}
