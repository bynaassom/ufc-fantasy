import { NextRequest, NextResponse } from "next/server";

// Converte polegadas para cm
function inToCm(val: string): string {
  const n = parseFloat(val);
  if (!n) return "--";
  return (n * 2.54).toFixed(1) + " cm";
}

// Converte libras para kg
function lbToKg(val: string): string {
  const n = parseFloat(val);
  if (!n) return "--";
  return (n * 0.453592).toFixed(1) + " kg";
}

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
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }

  // ── Helper: extrai valor antes de um label exato ─────────────
  function grab(pattern: RegExp): string {
    const m = html.match(pattern);
    if (!m) return "--";
    return (m[1] || "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // ── Cartel & nome ────────────────────────────────────────────
  const record = grab(/(\d+-\d+-\d+)\(V-D-E\)/);
  const nameMatch = html.match(/<h1[^>]*>\s*([^<]+)\s*<\/h1>/);
  const name = nameMatch ? nameMatch[1].trim() : slug;

  // ── Estatísticas de striking ─────────────────────────────────
  // Formato no HTML: "4.03\n\nGolpes Sig. Conectados\n\nPor Minuto"
  const slpm = grab(
    /(\d+\.\d+)\s*\n\s*\n?\s*Golpes Sig\. Conectados\s*\n\s*\n?\s*Por Minuto/i,
  );
  const sapm = grab(
    /(\d+\.\d+)\s*\n\s*\n?\s*Golpes Sig\. Absorvidos\s*\n\s*\n?\s*Por Minuto/i,
  );

  // Formato: "Precisão de striking 48%\n\n\n48%"
  const strAcc = grab(/Precisão de striking\s+(\d+)%/i);

  // Formato: "56\n\n%\n\nDefesa de Golpes Sig."
  const strDef = grab(
    /(\d+)\s*\n\s*\n?\s*%\s*\n\s*\n?\s*Defesa de Golpes Sig/i,
  );

  // ── Grappling ────────────────────────────────────────────────
  // Formato: "0.05\n\nMédia de quedas\n\nPor 15 Min"
  const tdAvg = grab(
    /(\d+\.\d+)\s*\n\s*\n?\s*Média de quedas\s*\n\s*\n?\s*Por 15 Min/i,
  );
  const subAvg = grab(
    /(\d+\.\d+)\s*\n\s*\n?\s*Média de finalizações\s*\n\s*\n?\s*Por 15 Min/i,
  );

  // Formato: "Precisão De Quedas 9%"
  const tdAcc = grab(/Precisão De Quedas\s+(\d+)%/i);

  // Formato: "76\n\n%\n\nDefesa De Quedas"
  const tdDef = grab(/(\d+)\s*\n\s*\n?\s*%\s*\n\s*\n?\s*Defesa De Quedas/i);

  // ── Outros ───────────────────────────────────────────────────
  const kdAvg = grab(/(\d+\.\d+)\s*\n\s*\n?\s*Média de Knockdowns/i);
  const avgFightTime = grab(/(\d+:\d+)\s*\n\s*\n?\s*Tempo médio de luta/i);

  // ── Vitórias por método ──────────────────────────────────────
  // Formato: "KO/TKO\n\n16 (67%)"
  const koMatch = html.match(/KO\/TKO\s*\n\s*\n?\s*(\d+)\s*\((\d+)%\)/i);
  const decMatch = html.match(/DEC\s*\n\s*\n?\s*(\d+)\s*\((\d+)%\)/i);
  const subMatch = html.match(/FIN\s*\n\s*\n?\s*(\d+)\s*\((\d+)%\)/i);

  // ── Físico — seção "Informações" (valores em unidades americanas) ──
  // Formato: "Altura\n\n76.00" (polegadas) e "Peso\n\n185.00" (libras)
  // A seção de Bio fica após "## Informações"
  const bioSection =
    html.split(/##\s*Informações|Saiba mais sobre/i)[1] || html;

  const heightRaw =
    grab.call(null, /Altura\s*\n\s*\n?\s*([\d.]+)/i) !== "--"
      ? grab.call(null, /Altura\s*\n\s*\n?\s*([\d.]+)/i)
      : bioSection.match(/Altura\s*\n\s*\n?\s*([\d.]+)/i)?.[1] || "--";

  const weightRaw =
    bioSection.match(/Peso\s*\n\s*\n?\s*([\d.]+)/i)?.[1] || "--";
  const reachRaw =
    bioSection.match(/Envergadura\s*\n\s*\n?\s*([\d.]+)/i)?.[1] || "--";
  const legRaw =
    bioSection.match(/Alcance das [Pp]ernas\s*\n\s*\n?\s*([\d.]+)/i)?.[1] ||
    "--";

  // Converte de imperial para métrico
  const height = heightRaw !== "--" ? inToCm(heightRaw) : "--";
  const weight = weightRaw !== "--" ? lbToKg(weightRaw) : "--";
  const reach = reachRaw !== "--" ? inToCm(reachRaw) : "--";
  const legReach = legRaw !== "--" ? inToCm(legRaw) : "--";

  return NextResponse.json({
    name,
    slug,
    record,
    physical: { height, weight, reach, legReach },
    striking: { slpm, sapm, strAcc, strDef },
    grappling: { tdAvg, tdAcc, tdDef, subAvg },
    other: { kdAvg, avgFightTime },
    wins_by: {
      ko: { count: koMatch?.[1] || "--", pct: koMatch?.[2] || "0" },
      dec: { count: decMatch?.[1] || "--", pct: decMatch?.[2] || "0" },
      sub: { count: subMatch?.[1] || "--", pct: subMatch?.[2] || "0" },
    },
  });
}
