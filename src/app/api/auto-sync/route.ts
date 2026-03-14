import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

function mapMethod(raw: string): "decision" | "submission" | "knockout" | null {
  const s = raw.toLowerCase().replace(/\s+/g, " ");
  if (s.includes("ko") || s.includes("tko")) return "knockout";
  if (
    s.includes("sub") ||
    s.includes("choke") ||
    s.includes("lock") ||
    s.includes("triangle") ||
    s.includes("armbar") ||
    s.includes("rear naked")
  )
    return "submission";
  if (s.includes("dec")) return "decision";
  return null;
}

async function scrapeUfcStats(url: string): Promise<UfcStatsResult[]> {
  const res = await fetch(`${url}?_=${Date.now()}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Cache-Control": "no-cache, no-store",
      Pragma: "no-cache",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`UFCStats HTTP ${res.status}`);
  const html = await res.text();

  const results: UfcStatsResult[] = [];

  // Parse HTML
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1];
    if (!row.includes("fighter-details")) continue;

    const fighterNames: string[] = [];
    const aRegex = /<a[^>]*fighter-details[^>]*>\s*([^<]+)\s*<\/a>/g;
    let aMatch;
    while ((aMatch = aRegex.exec(row)) !== null) {
      const name = aMatch[1].replace(/\s+/g, " ").trim();
      if (name) fighterNames.push(name);
    }
    if (fighterNames.length < 2) continue;

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

    const rowText = cells.join(" ");
    if (rowText.includes("View Matchup")) continue;

    let method: "decision" | "submission" | "knockout" | null = null;
    let round: number | null = null;
    for (const cell of cells) {
      if (!method) method = mapMethod(cell);
      const r = parseInt(cell, 10);
      if (!isNaN(r) && r >= 1 && r <= 5 && !round) round = r;
    }
    if (!method || !round) continue;

    results.push({
      winner: fighterNames[0],
      loser: fighterNames[1],
      method,
      round,
    });
  }

  if (results.length > 0) return results;

  // Fallback: parse markdown
  for (const line of html.split("\n")) {
    const cols = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cols.length < 9) continue;
    const method = mapMethod(cols[7] ?? "");
    const round = parseInt(cols[8] ?? "", 10) || null;
    if (!method || !round) continue;
    const fighterCol = (cols[1] ?? "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    const parts = fighterCol
      .split(/\s{2,}|\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length < 2) continue;
    results.push({ winner: parts[0], loser: parts[1], method, round });
  }

  return results;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSupabase = await createAdminClient();
  const now = new Date();

  // Busca eventos upcoming ou live com ufc_stats_url configurada
  // que estejam dentro da janela: picks_lock_at ≤ agora ≤ event_date + 6h
  const { data: events } = await adminSupabase
    .from("events")
    .select("id, name, slug, event_date, picks_lock_at, ufc_stats_url")
    .in("status", ["upcoming", "live"])
    .not("ufc_stats_url", "is", null)
    .order("event_date", { ascending: true });

  if (!events?.length) {
    return NextResponse.json({ ok: true, message: "Nenhum evento ativo" });
  }

  // Filtra eventos dentro da janela de tempo
  const activeEvents = events.filter((ev) => {
    const lockAt = new Date(ev.picks_lock_at);
    const endAt = new Date(
      new Date(ev.event_date).getTime() + 6 * 60 * 60 * 1000,
    );
    return now >= lockAt && now <= endAt;
  });

  if (!activeEvents.length) {
    return NextResponse.json({
      ok: true,
      message: "Fora da janela do evento — nenhuma ação",
    });
  }

  const allResults: string[] = [];

  for (const event of activeEvents) {
    // Busca lutas pendentes
    const { data: fights } = await adminSupabase
      .from("fights")
      .select(
        `
        id, result_confirmed,
        fighter_a:fighters!fighter_a_id(id, name),
        fighter_b:fighters!fighter_b_id(id, name)
      `,
      )
      .eq("event_id", event.id)
      .eq("result_confirmed", false);

    if (!fights?.length) continue;

    // Scrape UFCStats
    let ufcResults: UfcStatsResult[] = [];
    try {
      ufcResults = await scrapeUfcStats(event.ufc_stats_url);
    } catch {
      continue;
    }
    if (!ufcResults.length) continue;

    // Cruza e atualiza
    for (const fight of fights) {
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

      const winnerId = namesMatch(ufc.winner, fa) ? faId : fbId;
      const { error } = await adminSupabase
        .from("fights")
        .update({
          winner_id: winnerId,
          result_method: ufc.method,
          result_round: ufc.round,
          result_confirmed: true,
        })
        .eq("id", fight.id);

      if (!error) {
        await adminSupabase.rpc("score_picks_for_fight", {
          p_fight_id: fight.id,
        });
        allResults.push(
          `${fa} vs ${fb} → ${namesMatch(ufc.winner, fa) ? fa : fb} (${ufc.method}, R${ufc.round})`,
        );
      }
    }

    if (allResults.length > 0) {
      revalidatePath("/ranking");
      revalidatePath("/home");
      revalidatePath(`/event/${event.slug}`);
    }
  }

  return NextResponse.json({
    ok: true,
    message:
      allResults.length > 0
        ? `${allResults.length} resultado(s) importado(s)`
        : "Nenhum resultado novo no UFCStats",
    results: allResults,
  });
}

interface UfcStatsResult {
  winner: string;
  loser: string;
  method: "decision" | "submission" | "knockout";
  round: number;
}
