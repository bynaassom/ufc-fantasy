import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const { slug } = params;
  if (!slug)
    return NextResponse.json({ error: "Slug obrigatório" }, { status: 400 });

  let html = "";
  try {
    const res = await fetch(`https://www.ufc.com.br/athlete/${slug}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      next: { revalidate: 3600 }, // cache 1h
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }

  function extractText(pattern: RegExp): string {
    const m = html.match(pattern);
    return m
      ? m[1]
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim()
      : "";
  }

  function extractNumber(pattern: RegExp): string {
    const m = html.match(pattern);
    if (!m) return "--";
    return m[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // ── Dados básicos ────────────────────────────────────────────
  const record = extractNumber(/(\d+-\d+-\d+)\s*\(V-D-E\)/);
  const nickname = extractNumber(/"([^"]+)"\s*\n\s*#?\s*\n?\s*[A-Z]/);
  const nameMatch = html.match(/<h1[^>]*>\s*([^<]+)\s*<\/h1>/);
  const name = nameMatch ? nameMatch[1].trim() : slug;

  // Ranking
  const rankMatch = html.match(/#(\d+)\s*\n?\s*Peso/);
  const rank = rankMatch ? `#${rankMatch[1]}` : "";

  // ── Estatísticas principais ──────────────────────────────────
  // Striking
  const slpm = extractNumber(
    /(\d+\.\d+)\s*\n?\s*Golpes Sig\. Conectados\s*\n?\s*Por Minuto/,
  );
  const sapm = extractNumber(
    /(\d+\.\d+)\s*\n?\s*Golpes Sig\. Absorvidos\s*\n?\s*Por Minuto/,
  );
  const strAcc = extractNumber(/Precisão de striking (\d+)%/i);
  const strDef = extractNumber(/(\d+)\s*\n?\s*%\s*\n?\s*Defesa de Golpes Sig/i);

  // Grappling
  const tdAvg = extractNumber(
    /(\d+\.\d+)\s*\n?\s*Média de quedas\s*\n?\s*Por 15 Min/i,
  );
  const tdAcc = extractNumber(/Precisão De Quedas (\d+)%/i);
  const tdDef = extractNumber(/(\d+)\s*\n?\s*%\s*\n?\s*Defesa De Quedas/i);
  const subAvg = extractNumber(
    /(\d+\.\d+)\s*\n?\s*Média de finalizações\s*\n?\s*Por 15 Min/i,
  );

  // Outros
  const kdAvg = extractNumber(/(\d+\.\d+)\s*\n?\s*Média de Knockdowns/i);
  const avgFightTime = extractNumber(/(\d+:\d+)\s*\n?\s*Tempo médio de luta/i);

  // Vitórias por método
  const koWins = extractNumber(/KO\/TKO\s*\n?\s*(\d+)\s*\(/);
  const decWins = extractNumber(/DEC\s*\n?\s*(\d+)\s*\(/);
  const subWins = extractNumber(/FIN\s*\n?\s*(\d+)\s*\(/);

  // Percentuais de vitória por método
  const koPct = extractNumber(/KO\/TKO\s*\n?\s*\d+\s*\((\d+)%\)/);
  const decPct = extractNumber(/DEC\s*\n?\s*\d+\s*\((\d+)%\)/);
  const subPct = extractNumber(/FIN\s*\n?\s*\d+\s*\((\d+)%\)/);

  // Físico
  const height = extractNumber(/(\d+[\.,]\d+\s*cm)\s*\n?\s*(?:Altura|Height)/i);
  const weight = extractNumber(/(\d+[\.,]\d+\s*KG)\s*\n?\s*(?:Peso|Weight)/i);
  const reach = extractNumber(
    /(\d+[\.,]\d+\s*cm)\s*\n?\s*(?:Envergadura|Reach)/i,
  );
  const legReach = extractNumber(
    /(\d+[\.,]\d+\s*cm)\s*\n?\s*(?:Alcance das Pernas|Leg Reach)/i,
  );
  const country = extractNumber(
    /\n\s*([A-Za-záàâãéèêíïóôõöúüçñ\s]+)\s*\n?\s*PAÍS/i,
  );

  // Foto principal
  const photoMatch = html.match(
    /athlete_bio_full_body[^"']*["']\s*(https?:\/\/[^"']+)["']/i,
  );
  const photo = photoMatch ? photoMatch[1] : "";

  return NextResponse.json({
    name,
    slug,
    record,
    rank,
    nickname,
    photo,
    country,
    striking: { slpm, sapm, strAcc, strDef },
    grappling: { tdAvg, tdAcc, tdDef, subAvg },
    other: { kdAvg, avgFightTime },
    wins_by: {
      ko: { count: koWins, pct: koPct },
      dec: { count: decWins, pct: decPct },
      sub: { count: subWins, pct: subPct },
    },
    physical: { height, weight, reach, legReach },
  });
}
