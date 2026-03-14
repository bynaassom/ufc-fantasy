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

// ─── Scrape UFCStats ─────────────────────────────────────────
async function scrapeUfcStats(url: string): Promise<UfcStatsResult[]> {
  const res = await fetch(`${url}?_=${Date.now()}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`UFCStats HTTP ${res.status}`);
  const html = await res.text();

  const results: UfcStatsResult[] = [];

  // Pega todas as <tr> que contenham links para fighter-details
  // (= linhas de luta, independente de classes CSS)
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1];

    // Só processa linhas que têm links de fighter
    if (!row.includes("fighter-details")) continue;

    // Extrai nomes dos lutadores via href="fighter-details"
    const fighterNames: string[] = [];
    const anchorRegex = /<a[^>]*fighter-details[^>]*>\s*([^<]+)\s*<\/a>/g;
    let anchorMatch;
    while ((anchorMatch = anchorRegex.exec(row)) !== null) {
      const name = anchorMatch[1].replace(/\s+/g, " ").trim();
      if (name) fighterNames.push(name);
    }
    if (fighterNames.length < 2) continue;

    // Extrai todas as células de texto
    const cells: string[] = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(row)) !== null) {
      const text = cellMatch[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      cells.push(text);
    }

    // Linhas sem resultado têm "View Matchup" — pula
    const rowText = cells.join(" ");
    if (rowText.includes("View Matchup") || rowText.includes("view matchup"))
      continue;

    // Procura método e round em todas as células
    let method: "decision" | "submission" | "knockout" | null = null;
    let round: number | null = null;

    for (const cell of cells) {
      const m = mapMethod(cell);
      if (m && !method) method = m;

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

  // ── Fallback: parse tabela markdown ─────────────────────────
  // O servidor às vezes recebe versão simplificada sem HTML completo
  // Formato das linhas: | W/L | [Fighter A](url)\n[Fighter B](url) | ... | Method | Round | Time |
  for (const line of html.split("\n")) {
    const cols = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cols.length < 9) continue;

    const methodRaw = cols[7] ?? "";
    const roundRaw = cols[8] ?? "";
    const method = mapMethod(methodRaw);
    const round = parseInt(roundRaw, 10) || null;
    if (!method || !round) continue;

    // Remove markdown links: [Name](url) → Name
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

// ─── Handler ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const adminSupabase = await createAdminClient();

  // Auth: aceita session de admin OU SYNC_SECRET no header (para chamadas externas)
  const authHeader = req.headers.get("authorization");
  const syncSecret = process.env.SYNC_SECRET;
  const isExternalCall = syncSecret && authHeader === `Bearer ${syncSecret}`;

  if (!isExternalCall) {
    const supabase = await createClient();
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
  }

  let { event_id, ufc_stats_url } = await req.json().catch(() => ({}));

  // Chamada externa sem parâmetros: busca evento ativo automaticamente
  if (!event_id && isExternalCall) {
    const now = new Date();
    const { data: activeEvent } = await adminSupabase
      .from("events")
      .select("id, slug, event_date, picks_lock_at, ufc_stats_url")
      .in("status", ["upcoming", "live"])
      .not("ufc_stats_url", "is", null)
      .order("event_date", { ascending: true })
      .limit(1)
      .single();

    if (!activeEvent)
      return NextResponse.json({ ok: true, message: "Nenhum evento ativo" });

    // Verifica janela de tempo: picks_lock_at ≤ agora ≤ event_date + 6h
    const lockAt = new Date(activeEvent.picks_lock_at);
    const endAt = new Date(
      new Date(activeEvent.event_date).getTime() + 6 * 60 * 60 * 1000,
    );
    if (now < lockAt || now > endAt) {
      return NextResponse.json({
        ok: true,
        message: "Fora da janela do evento",
      });
    }

    event_id = activeEvent.id;
    ufc_stats_url = activeEvent.ufc_stats_url;
  }

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
    // Busca amostra do HTML para diagnóstico
    let htmlSample = "";
    try {
      const r = await fetch(`${ufc_stats_url}?_=${Date.now()}`, {
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const h = await r.text();
      // Pega trecho ao redor da palavra "Method" para ver a estrutura
      const idx = h.indexOf("Method");
      htmlSample =
        idx >= 0
          ? h.substring(Math.max(0, idx - 200), idx + 500)
          : h.substring(0, 500);
    } catch {}
    return NextResponse.json({
      ok: true,
      message: "Nenhum resultado no UFCStats ainda — tente em breve",
      debug_html: htmlSample,
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
