import { NextRequest, NextResponse } from "next/server";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// ─────────────────────────────────────────────────────────────
// Scrapa a página do atleta no ufc.com.br e extrai a URL real
// da foto — que tem data específica por atleta
// ─────────────────────────────────────────────────────────────
async function scrapeUFCPage(
  slug: string,
): Promise<{ headshot_url: string; country: string } | null> {
  const url = `https://www.ufc.com.br/athlete/${slug}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        Referer: "https://www.ufc.com.br/",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Procura pela URL da imagem full body dentro do HTML
    // Padrão: /images/styles/athlete_bio_full_body/s3/YYYY-MM/NAME_L_MM-DD.png
    const patterns = [
      // og:image meta tag (mais confiável)
      /property="og:image"\s+content="([^"]*athlete_bio_full_body[^"]+\.png)"/,
      /"og:image","content":"([^"]*athlete_bio_full_body[^"]+\.png)"/,
      // src direto na tag img
      /src="(https:\/\/[^"]*athlete_bio_full_body[^"]+\.png)"/,
      // dentro de JSON embutido
      /"full_body_image_url_desktop":"([^"]+\.png)"/,
      /"url":"(https:\/\/[^"]*athlete_bio_full_body[^"]+\.png)"/,
      // qualquer ocorrência do padrão de URL
      /(https:\/\/[^\s"']+athlete_bio_full_body\/s3\/\d{4}-\d{2}\/[^"'\s]+\.png)/,
      // versão relativa
      /(\/images\/styles\/athlete_bio_full_body\/s3\/\d{4}-\d{2}\/[^"'\s]+\.png)/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        let url = match[1].replace(/\\/g, "");
        if (url.startsWith("/")) {
          url = "https://www.ufc.com.br" + url;
        }
        if (url.includes("athlete_bio_full_body")) {
          // Extrai país também
          const countryMatch =
            html.match(/"nationality"\s*:\s*"([^"]+)"/) ||
            html.match(
              /class="[^"]*nationality[^"]*"[^>]*>\s*<[^>]+>\s*([^<]+)/,
            ) ||
            html.match(/Nacionalidade[^<]*<\/[^>]+>\s*<[^>]+>\s*([^<\n]+)/);
          const country = countryMatch?.[1]?.trim() || "";
          return { headshot_url: url, country };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Tenta variações do slug para nomes compostos
// "Reinier de Ridder" → ["reinier-de-ridder", "de-ridder-reinier"]
// ─────────────────────────────────────────────────────────────
function generateSlugs(name: string): string[] {
  const base = toSlug(name);
  const parts = base.split("-");
  const slugs = [base];

  // Remove sufixos comuns e tenta de novo
  const cleaned = base.replace(/-jr$|-sr$|-ii$|-iii$/, "");
  if (cleaned !== base) slugs.push(cleaned);

  // Para nomes com 3+ partes, tenta sem o meio
  if (parts.length >= 3) {
    slugs.push(`${parts[0]}-${parts[parts.length - 1]}`);
  }

  return slugs;
}

// ─────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const slugs = generateSlugs(name);

  for (const slug of slugs) {
    const result = await scrapeUFCPage(slug);
    if (result?.headshot_url) {
      return NextResponse.json({
        name,
        slug,
        headshot_url: result.headshot_url,
        country: result.country,
        source: "ufc.com.br",
        ufc_url: `https://www.ufc.com.br/athlete/${slug}`,
      });
    }
  }

  // Não encontrou — retorna vazio para o frontend mostrar campo manual
  return NextResponse.json({
    name,
    headshot_url: "",
    country: "",
    source: "not-found",
    ufc_url: `https://www.ufc.com.br/athlete/${slugs[0]}`,
  });
}
