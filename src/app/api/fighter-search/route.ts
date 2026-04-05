import { NextRequest, NextResponse } from "next/server";
import {
  generateFighterSlugCandidates,
  resolveUfcFighterMedia,
} from "@/lib/ufc-fighter-media";

// ─────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const result = await resolveUfcFighterMedia(name);
  if (result?.headshot_url) {
    return NextResponse.json({
      name,
      slug: result.slug,
      headshot_url: result.headshot_url,
      country: result.country,
      source: result.source,
      ufc_url: result.ufc_url,
    });
  }

  // Não encontrou — retorna vazio para o frontend mostrar campo manual
  const slugs = generateFighterSlugCandidates(name);
  return NextResponse.json({
    name,
    headshot_url: "",
    country: "",
    source: "not-found",
    ufc_url: `https://www.ufc.com.br/athlete/${slugs[0]}`,
  });
}
