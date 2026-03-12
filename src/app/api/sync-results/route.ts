import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// ─── Normalização ────────────────────────────────────────────
function normalize(name: string) {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

function namesMatch(a: string, b: string): boolean {
  if (normalize(a) === normalize(b)) return true;
  const pa = a.toLowerCase().split(" ").filter(Boolean);
  const pb = b.toLowerCase().split(" ").filter(Boolean);
  const lastA = pa[pa.length - 1];
  const lastB = pb[pb.length - 1];
  if (lastA !== lastB) return false;
  return pa[0]?.[0] === pb[0]?.[0];
}

// ─── Mapeia método ESPN/UFCStats → nosso enum ────────────────
function mapMethod(raw: string): "decision" | "submission" | "knockout" | null {
  const s = raw.toLowerCase();
  if (s.includes("ko") || s.includes("tko") || s.includes("knockout"))
    return "knockout";
  if (s.includes("sub")) return "submission";
  if (s.includes("dec") || s.includes("decision")) return "decision";
  return null;
}

// ─── Scrape ufcstats evento → lista de resultados ────────────
async function scrapeUfcStats(ufcStatsUrl: string): Promise<UfcStatsResult[]> {
  const res = await fetch(ufcStatsUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`UFCStats HTTP ${res.status}`);
  const html = await res.text();

  const results: UfcStatsResult[] = [];

  // Cada linha de luta: <tr class="b-fight-details__table-row ... js-fight-details-click">
  const rowRegex = /js-fight-details-click[^>]*>([\s\S]*?)<\/tr>/g;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1];

    // Extrai células <td>
    const cells: string[] = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(row)) !== null) {
      // Remove tags HTML e normaliza espaços
      const text = cellMatch[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      cells.push(text);
    }

    // Layout UFCStats: [fighters, weight, method, round, time, format, referee, details]
    // fighters cell: "Fighter A Fighter B" (dois nomes separados por espaço)
    if (cells.length < 6) continue;

    // Extrai nomes dos lutadores do HTML original (cada <a> na primeira célula)
    const fighterCell = row.match(/<td[^>]*>([\s\S]*?)<\/td>/)?.[1] ?? "";
    const fighterNames: string[] = [];
    const anchorRegex = /<a[^>]*>\s*([\s\S]*?)\s*<\/a>/g;
    let anchorMatch;
    while ((anchorMatch = anchorRegex.exec(fighterCell)) !== null) {
      const name = anchorMatch[1].replace(/\s+/g, " ").trim();
      if (name) fighterNames.push(name);
    }

    if (fighterNames.length < 2) continue;

    // Determina vencedor: se tem ícone/classe de win, é o primeiro
    // UFCStats marca o vencedor com uma seta ou cor, mas na listagem
    // o primeiro nome listado é sempre o vencedor quando a luta acabou
    const methodRaw = cells[2] ?? "";
    const roundRaw = cells[3] ?? "";
    const method = mapMethod(methodRaw);
    const round = parseInt(roundRaw, 10) || null;

    // Se método é nulo = luta ainda não aconteceu
    if (!method || !round) continue;

    results.push({
      fighter1: fighterNames[0],
      fighter2: fighterNames[1],
      winner: fighterNames[0], // primeiro = vencedor no UFCStats
      method,
      round,
    });
  }

  return results;
}

// ─── ESPN: busca evento e retorna winner por luta ────────────
async function fetchEspnResults(espnEventId: string): Promise<EspnResult[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`);
  const data = await res.json();

  const results: EspnResult[] = [];
  const events = data.events ?? [];

  // Procura evento pelo ID
  const event = events.find(
    (e: any) => e.id === espnEventId || e.uid?.includes(espnEventId),
  );
  if (!event) return results;

  for (const comp of event.competitions ?? []) {
    if (!comp.status?.type?.completed) continue;
    const winner = comp.competitors?.find((c: any) => c.winner === true);
    const loser = comp.competitors?.find((c: any) => c.winner === false);
    if (!winner || !loser) continue;
    results.push({
      winnerName: winner.athlete?.fullName ?? "",
      loserName: loser.athlete?.fullName ?? "",
    });
  }

  return results;
}

// ─── Handler principal ───────────────────────────────────────
export async function POST(req: NextRequest) {
  // Auth
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { event_id, ufc_stats_url, espn_event_id } = await req.json();
  if (!event_id)
    return NextResponse.json(
      { error: "event_id obrigatório" },
      { status: 400 },
    );
  if (!ufc_stats_url)
    return NextResponse.json(
      { error: "ufc_stats_url obrigatório" },
      { status: 400 },
    );

  // Busca lutas do evento no banco
  const { data: fights } = await adminSupabase
    .from("fights")
    .select(
      `
      id,
      result_confirmed,
      fighter_a:fighters!fighter_a_id(id, name),
      fighter_b:fighters!fighter_b_id(id, name)
    `,
    )
    .eq("event_id", event_id);

  if (!fights?.length)
    return NextResponse.json(
      { error: "Nenhuma luta encontrada" },
      { status: 404 },
    );

  // ── Scrape UFCStats (método + round + vencedor base) ────────
  let ufcStatsResults: UfcStatsResult[] = [];
  try {
    ufcStatsResults = await scrapeUfcStats(ufc_stats_url);
  } catch (e: any) {
    return NextResponse.json(
      { error: `UFCStats: ${e.message}` },
      { status: 502 },
    );
  }

  // ── ESPN (vencedor confirmado, quando disponível) ───────────
  let espnResults: EspnResult[] = [];
  if (espn_event_id) {
    try {
      espnResults = await fetchEspnResults(espn_event_id);
    } catch {
      // ESPN falhou — continua só com UFCStats
    }
  }

  // ── Cruza dados e prepara updates ───────────────────────────
  const updates: {
    fight_id: string;
    winner_id: string;
    method: "decision" | "submission" | "knockout";
    round: number;
    fighter_a_name: string;
    fighter_b_name: string;
    winner_name: string;
  }[] = [];

  for (const fight of fights) {
    if (fight.result_confirmed) continue; // já tem resultado

    const fa = (fight.fighter_a as any)?.name as string;
    const fb = (fight.fighter_b as any)?.name as string;
    const faId = (fight.fighter_a as any)?.id as string;
    const fbId = (fight.fighter_b as any)?.id as string;
    if (!fa || !fb) continue;

    // Procura no UFCStats
    const ufc = ufcStatsResults.find(
      (r) =>
        (namesMatch(r.fighter1, fa) || namesMatch(r.fighter2, fa)) &&
        (namesMatch(r.fighter1, fb) || namesMatch(r.fighter2, fb)),
    );
    if (!ufc) continue;

    // Determina winner_id
    // Primeiro tenta confirmar pelo ESPN
    let winnerId: string | null = null;
    const espn = espnResults.find(
      (e) =>
        (namesMatch(e.winnerName, fa) || namesMatch(e.winnerName, fb)) &&
        (namesMatch(e.loserName, fa) || namesMatch(e.loserName, fb)),
    );

    if (espn) {
      // ESPN confirma o vencedor
      winnerId = namesMatch(espn.winnerName, fa) ? faId : fbId;
    } else {
      // UFCStats: primeiro nome = vencedor
      winnerId = namesMatch(ufc.winner, fa) ? faId : fbId;
    }

    if (!winnerId) continue;

    updates.push({
      fight_id: fight.id,
      winner_id: winnerId,
      method: ufc.method,
      round: ufc.round,
      fighter_a_name: fa,
      fighter_b_name: fb,
      winner_name: winnerId === faId ? fa : fb,
    });
  }

  if (!updates.length) {
    return NextResponse.json({
      ok: true,
      message:
        "Nenhum resultado novo encontrado (evento ainda não ocorreu ou já processado)",
      found: ufcStatsResults.length,
    });
  }

  // ── Salva resultados e pontua picks ─────────────────────────
  let saved = 0;
  const savedFights = [];

  for (const upd of updates) {
    const { error } = await adminSupabase
      .from("fights")
      .update({
        winner_id: upd.winner_id,
        result_method: upd.method,
        result_round: upd.round,
        result_confirmed: true,
      })
      .eq("id", upd.fight_id);

    if (!error) {
      saved++;
      savedFights.push(
        `${upd.fighter_a_name} vs ${upd.fighter_b_name} → ${upd.winner_name} (${upd.method}, R${upd.round})`,
      );

      // Pontua picks desta luta
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/results/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fight_id: upd.fight_id }),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    message: `${saved} resultado(s) importado(s) e picks pontuados`,
    results: savedFights,
  });
}

// ─── Tipos ───────────────────────────────────────────────────
interface UfcStatsResult {
  fighter1: string;
  fighter2: string;
  winner: string;
  method: "decision" | "submission" | "knockout";
  round: number;
}

interface EspnResult {
  winnerName: string;
  loserName: string;
}
