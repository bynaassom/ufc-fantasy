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
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }

  // Helper: extrai valor numérico/texto antes de um label
  function before(label: string | RegExp): string {
    const pattern =
      typeof label === "string"
        ? new RegExp(
            `([\\d:.,]+[\\s\\w]*?)\\s*\\n?\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
            "i",
          )
        : label;
    const m = html.match(pattern);
    return m
      ? m[1]
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim()
      : "--";
  }

  // Helper: extrai percentual de um padrão "XX%"
  function pct(label: string): string {
    const m =
      html.match(
        new RegExp(
          `(\\d+)\\s*%[\\s\\S]{0,30}?${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
          "i",
        ),
      ) ||
      html.match(
        new RegExp(
          `${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]{0,30}?(\\d+)\\s*%`,
          "i",
        ),
      );
    return m ? m[1] : "--";
  }

  // Cartel: "24-6-0(V-D-E)"
  const recordMatch = html.match(/(\d+-\d+-\d+)\s*\(V-D-E\)/);
  const record = recordMatch ? recordMatch[1] : "--";

  // Nome
  const nameMatch = html.match(/<h1[^>]*>\s*([^<]+)\s*<\/h1>/);
  const name = nameMatch ? nameMatch[1].trim() : slug;

  // Físico — aparecem antes dos labels
  const height =
    before("Altura") !== "--"
      ? before("Altura")
      : before(/(\d+[.,]\d+\s*cm)\s*\n?\s*(?:Altura|Height)/i);
  const weight =
    before("Peso") !== "--"
      ? before("Peso")
      : before(/(\d+[.,]\d+\s*KG)\s*\n?\s*(?:Peso|Weight)/i);
  const reach = before("Envergadura");
  const legReach = before("Alcance das Pernas");

  // Striking — formato "4.03\nGolpes Sig. Conectados\nPor Minuto"
  const slpmMatch = html.match(
    /(\d+\.\d+)\s*\n?\s*Golpes Sig\. Conectados\s*\n?\s*Por Minuto/i,
  );
  const sapmMatch = html.match(
    /(\d+\.\d+)\s*\n?\s*Golpes Sig\. Absorvidos\s*\n?\s*Por Minuto/i,
  );
  const slpm = slpmMatch ? slpmMatch[1] : "--";
  const sapm = sapmMatch ? sapmMatch[1] : "--";

  // Precisão striking — "Precisão de striking 48%\n\n\n48%"
  const strAccMatch = html.match(/Precisão de striking\s+(\d+)%/i);
  const strAcc = strAccMatch ? strAccMatch[1] : "--";

  // Defesa striking — "56\n%\nDefesa de Golpes Sig."
  const strDefMatch = html.match(
    /(\d+)\s*\n?\s*%\s*\n?\s*Defesa de Golpes Sig/i,
  );
  const strDef = strDefMatch ? strDefMatch[1] : "--";

  // Grappling
  const tdAvgMatch = html.match(
    /(\d+\.\d+)\s*\n?\s*Média de quedas\s*\n?\s*Por 15 Min/i,
  );
  const subAvgMatch = html.match(
    /(\d+\.\d+)\s*\n?\s*Média de finalizações\s*\n?\s*Por 15 Min/i,
  );
  const tdAvg = tdAvgMatch ? tdAvgMatch[1] : "--";
  const subAvg = subAvgMatch ? subAvgMatch[1] : "--";

  // Precisão quedas — "Precisão De Quedas 9%"
  const tdAccMatch = html.match(/Precisão De Quedas\s+(\d+)%/i);
  const tdAcc = tdAccMatch ? tdAccMatch[1] : "--";

  // Defesa quedas — "76\n%\nDefesa De Quedas"
  const tdDefMatch = html.match(/(\d+)\s*\n?\s*%\s*\n?\s*Defesa De Quedas/i);
  const tdDef = tdDefMatch ? tdDefMatch[1] : "--";

  // Knockdowns e tempo médio
  const kdMatch = html.match(/(\d+\.\d+)\s*\n?\s*Média de Knockdowns/i);
  const kdAvg = kdMatch ? kdMatch[1] : "--";
  const timeMatch = html.match(/(\d+:\d+)\s*\n?\s*Tempo médio de luta/i);
  const avgFightTime = timeMatch ? timeMatch[1] : "--";

  // Vitórias por método — "KO/TKO\n16 (67%)"
  const koMatch = html.match(/KO\/TKO\s*\n?\s*(\d+)\s*\((\d+)%\)/i);
  const decMatch = html.match(/DEC\s*\n?\s*(\d+)\s*\((\d+)%\)/i);
  const subMatch = html.match(/FIN\s*\n?\s*(\d+)\s*\((\d+)%\)/i);

  return NextResponse.json({
    name,
    slug,
    record,
    physical: {
      height: height !== "--" ? height : "",
      weight: weight !== "--" ? weight : "",
      reach: reach !== "--" ? reach : "",
      legReach: legReach !== "--" ? legReach : "",
    },
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
