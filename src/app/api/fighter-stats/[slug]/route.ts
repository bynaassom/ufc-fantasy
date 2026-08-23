import { NextRequest, NextResponse } from "next/server";
import { fetchUfcFighterStats } from "@/lib/ufc-fighter-stats";

/**
 * Kept as a compatibility route for FightStatsCompare. The reusable module
 * owns slug candidates, the .com.br/.com fallback, cache policy and parsing.
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params;
  if (!slug) return NextResponse.json({ error: "Slug obrigatório" }, { status: 400 });

  const payload = await fetchUfcFighterStats({
    slug,
    name: req.nextUrl.searchParams.get("name") || slug,
  });

  if (!payload) {
    return NextResponse.json(
      { error: "Página carregada, mas sem estatísticas reconhecíveis" },
      { status: 502 },
    );
  }

  return NextResponse.json(payload);
}
