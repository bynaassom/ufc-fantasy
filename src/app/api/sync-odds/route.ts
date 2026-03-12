import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const ODDS_API_KEY  = process.env.ODDS_API_KEY!;
const ODDS_API_BASE = "https://api.the-odds-api.com/v4";

// Normaliza nome do lutador para comparação fuzzy
// "Islam Makhachev" → "islammakhachev"
function normalize(name: string) {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

// Tenta casar nome da API com nome do banco
// Retorna true se um contém o outro (cobre abreviações e variações)
function namesMatch(apiName: string, dbName: string): boolean {
  const a = normalize(apiName);
  const b = normalize(dbName);
  if (a === b) return true;
  // Divide em partes e checa se as partes principais batem
  const partsA = apiName.toLowerCase().split(" ").filter(Boolean);
  const partsB = dbName.toLowerCase().split(" ").filter(Boolean);
  // Sobrenomes iguais + pelo menos inicial do primeiro nome
  const lastA = partsA[partsA.length - 1];
  const lastB = partsB[partsB.length - 1];
  if (lastA !== lastB) return false;
  // Sobrenomes batem — checa primeiro nome
  const firstA = partsA[0];
  const firstB = partsB[0];
  return firstA[0] === firstB[0];
}

export async function POST(req: NextRequest) {
  // Auth: só admin pode chamar
  const supabase = await createAdminClient();

  if (!ODDS_API_KEY) {
    return NextResponse.json({ error: "ODDS_API_KEY não configurada" }, { status: 500 });
  }

  try {
    // ── 1. Busca eventos UFC próximos no banco ──────────────────
    const { data: events, error: evError } = await supabase
      .from("events")
      .select("id, name, slug, status")
      .in("status", ["upcoming", "live"])
      .order("event_date");

    if (evError || !events?.length) {
      return NextResponse.json({ error: "Nenhum evento upcoming/live encontrado" }, { status: 404 });
    }

    // ── 2. Busca lutas UFC na The Odds API ─────────────────────
    const oddsRes = await fetch(
      `${ODDS_API_BASE}/sports/mma_mixed_martial_arts/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h&oddsFormat=american`,
      { next: { revalidate: 0 } }
    );

    if (!oddsRes.ok) {
      const txt = await oddsRes.text();
      return NextResponse.json({ error: `Odds API error: ${oddsRes.status} — ${txt}` }, { status: 502 });
    }

    const oddsData: OddsEvent[] = await oddsRes.json();
    const remaining = oddsRes.headers.get("x-requests-remaining");

    // ── 3. Busca lutas do banco para os eventos ────────────────
    const eventIds = events.map((e) => e.id);
    const { data: fights } = await supabase
      .from("fights")
      .select(`
        id, event_id,
        fighter_a:fighters!fighter_a_id(id, name),
        fighter_b:fighters!fighter_b_id(id, name)
      `)
      .in("event_id", eventIds);

    if (!fights?.length) {
      return NextResponse.json({ error: "Nenhuma luta encontrada nos eventos" }, { status: 404 });
    }

    // ── 4. Cruza lutas do banco com odds da API ────────────────
    const updates: { id: string; odds_a: string | null; odds_b: string | null }[] = [];
    let matched = 0;
    let skipped = 0;

    for (const fight of fights) {
      const fa = (fight.fighter_a as any)?.name as string;
      const fb = (fight.fighter_b as any)?.name as string;
      if (!fa || !fb) { skipped++; continue; }

      // Procura na lista de eventos da Odds API
      // Nomes dos lutadores ficam dentro de bookmakers > markets > outcomes
      const oddsEvent = oddsData.find((oe) => {
        const allNames = oe.bookmakers?.flatMap((bk) =>
          bk.markets?.flatMap((m) => m.outcomes.map((o) => o.name)) ?? []
        ) ?? [];
        return allNames.some((n) => namesMatch(n, fa)) &&
               allNames.some((n) => namesMatch(n, fb));
      });

      if (!oddsEvent) { skipped++; continue; }

      // Pega a melhor bookmaker disponível (preferência: DraftKings > FanDuel > primeira)
      const bk =
        oddsEvent.bookmakers?.find((b) => b.key === "draftkings") ||
        oddsEvent.bookmakers?.find((b) => b.key === "fanduel")    ||
        oddsEvent.bookmakers?.[0];

      if (!bk) { skipped++; continue; }

      const market = bk.markets?.find((m) => m.key === "h2h");
      if (!market) { skipped++; continue; }

      const outcomeA = market.outcomes.find((o) => namesMatch(o.name, fa));
      const outcomeB = market.outcomes.find((o) => namesMatch(o.name, fb));

      const odds_a = outcomeA ? formatOdds(outcomeA.price) : null;
      const odds_b = outcomeB ? formatOdds(outcomeB.price) : null;

      updates.push({ id: fight.id, odds_a, odds_b });
      matched++;
    }

    // ── 5. Salva no banco ──────────────────────────────────────
    let saved = 0;
    for (const upd of updates) {
      const { error } = await supabase
        .from("fights")
        .update({ odds_a: upd.odds_a, odds_b: upd.odds_b })
        .eq("id", upd.id);
      if (!error) saved++;
    }

    return NextResponse.json({
      ok: true,
      message: `${saved} lutas atualizadas, ${skipped} sem match`,
      requests_remaining: remaining,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Formata price number → string americano (+120, -150)
function formatOdds(price: number): string {
  if (price >= 0) return `+${price}`;
  return `${price}`;
}

// ── Tipos da The Odds API ──────────────────────────────────
interface OddsEvent {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  outcomes?: { name: string }[];   // top-level outcomes (alguns endpoints)
  bookmakers?: {
    key: string;
    title: string;
    markets: {
      key: string;
      outcomes: { name: string; price: number }[];
    }[];
  }[];
}
