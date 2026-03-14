import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Normalização de nomes ───────────────────────────────────
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

// ─── Mapeia método UFCStats → nosso enum ─────────────────────
function mapMethod(raw: string): "decision" | "submission" | "knockout" | null {
  const s = raw.toLowerCase();
  if (s.includes("ko") || s.includes("tko")) return "knockout";
  if (s.includes("sub")) return "submission";
  if (s.includes("dec")) return "decision";
  return null;
}

// ─── Scrape UFCStats ─────────────────────────────────────────
async function scrapeUfcStats(url: string): Promise<UfcStatsResult[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`UFCStats HTTP ${res.status}`);
  const html = await res.text();

  const results: UfcStatsResult[] = [];

  // UFCStats usa <tr class="b-fight-details__table-row b-fight-details__table-row__hover js-fight-details-click">
  // mas também aceita qualquer <tr> que tenha data-link com fight-details
  // Captura todas as <tr> que contenham links para fighter-details (= linhas de luta)
  const rowRegex = /<tr[^>]*b-fight-details__table-row[^>]*>([\s\S]*?)<\/tr>/g;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1];

    // Extrai todas as células
    const cells: string[] = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(row)) !== null) {
      cells.push(
        cellMatch[1]
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      );
    }
    if (cells.length < 8) continue; // linhas de resultado têm 10 colunas

    // Nomes dos lutadores via <a href="fighter-details"> na primeira célula
    const fighterCell = row.match(/<td[^>]*>([\s\S]*?)<\/td>/)?.[1] ?? "";
    const fighterNames: string[] = [];
    const anchorRegex = /<a[^>]*fighter-details[^>]*>\s*([\s\S]*?)\s*<\/a>/g;
    let anchorMatch;
    while ((anchorMatch = anchorRegex.exec(fighterCell)) !== null) {
      const name = anchorMatch[1].replace(/\s+/g, " ").trim();
      if (name) fighterNames.push(name);
    }
    if (fighterNames.length < 2) continue;

    // Layout: [W/L, fighters, kd, str, td, sub, weight, method, round, time]
    // método está na coluna 7 (índice 7), round na 8
    const method = mapMethod(cells[7] ?? "");
    const round = parseInt(cells[8] ?? "", 10) || null;
    if (!method || !round) continue;

    // Vencedor: a célula W/L (cells[0]) contém "W" para o primeiro lutador quando ganhou
    // O UFCStats lista o vencedor primeiro na linha
    results.push({
      winner: fighterNames[0],
      loser: fighterNames[1],
      method,
      round,
    });
  }

  return results;
}

// ─── Handler ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
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

  const { event_id, ufc_stats_url } = await req.json();
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

  const { data: fights } = await adminSupabase
    .from("fights")
    .select(
      `
      id, result_confirmed,
      event:events(slug),
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

  let ufcResults: UfcStatsResult[] = [];
  try {
    ufcResults = await scrapeUfcStats(ufc_stats_url);
  } catch (e: any) {
    return NextResponse.json(
      { error: `UFCStats: ${e.message}` },
      { status: 502 },
    );
  }

  if (!ufcResults.length) {
    return NextResponse.json({
      ok: true,
      message: "Nenhum resultado no UFCStats ainda — tente em breve",
    });
  }

  const updates: Update[] = [];

  for (const fight of fights) {
    if (fight.result_confirmed) continue;

    const fa = (fight.fighter_a as any)?.name as string;
    const fb = (fight.fighter_b as any)?.name as string;
    const faId = (fight.fighter_a as any)?.id as string;
    const fbId = (fight.fighter_b as any)?.id as string;
    if (!fa || !fb) continue;

    const ufc = ufcResults.find(
      (r) =>
        (namesMatch(r.winner, fa) || namesMatch(r.winner, fb)) &&
        (namesMatch(r.loser, fa) || namesMatch(r.loser, fb)),
    );
    if (!ufc) continue;

    updates.push({
      fight_id: fight.id,
      winner_id: namesMatch(ufc.winner, fa) ? faId : fbId,
      method: ufc.method,
      round: ufc.round,
      label: `${fa} vs ${fb} → ${namesMatch(ufc.winner, fa) ? fa : fb} (${ufc.method}, R${ufc.round})`,
      eventSlug: (fight.event as any)?.slug,
    });
  }

  if (!updates.length) {
    return NextResponse.json({
      ok: true,
      message: `UFCStats tem ${ufcResults.length} resultado(s), mas nenhum casa com lutas pendentes`,
    });
  }

  let saved = 0;
  const savedLabels: string[] = [];
  const slugsToRevalidate = new Set<string>();

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
      savedLabels.push(upd.label);
      if (upd.eventSlug) slugsToRevalidate.add(upd.eventSlug);
      await adminSupabase.rpc("score_picks_for_fight", {
        p_fight_id: upd.fight_id,
      });
    }
  }

  revalidatePath("/ranking");
  revalidatePath("/home");
  Array.from(slugsToRevalidate).forEach((slug) => {
    revalidatePath(`/event/${slug}`);
  });

  return NextResponse.json({
    ok: true,
    message: `${saved} resultado(s) importado(s) e picks pontuados`,
    results: savedLabels,
  });
}

interface UfcStatsResult {
  winner: string;
  loser: string;
  method: "decision" | "submission" | "knockout";
  round: number;
}

interface Update {
  fight_id: string;
  winner_id: string;
  method: "decision" | "submission" | "knockout";
  round: number;
  label: string;
  eventSlug: string | undefined;
}
