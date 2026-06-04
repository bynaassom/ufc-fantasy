export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getPublicEventCutoffIso } from "@/lib/event-sequence";
import {
  namesMatch,
  parseUfcStatsEventResults,
  type SyncedResultMethod,
  type UfcStatsResult,
} from "@/lib/ufc-results-sync";
import { isAllowedScrapeUrl } from "@/lib/security";
import { logAdminAction } from "@/lib/admin-audit";
import { assertSameOriginForMutation } from "@/server/api";
import { CACHE_TAGS } from "@/server/cache-tags";
import { completeEventIfAllResultsConfirmed } from "@/server/services/event-lifecycle";

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
  return parseUfcStatsEventResults(html);
}

// ─── Handler ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const adminSupabase = await createAdminClient();
  let adminUserId: string | null = null;

  // Aceita session de admin OU SYNC_SECRET no header (cron-job.org)
  const authHeader = req.headers.get("authorization");
  const syncSecret = process.env.SYNC_SECRET;
  const isExternalCall = syncSecret && authHeader === `Bearer ${syncSecret}`;

  if (!isExternalCall) {
    assertSameOriginForMutation(req);
  }

  if (!isExternalCall) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role, is_banned")
      .eq("id", user.id)
      .single();
    if (!profile || profile.role !== "admin" || profile.is_banned)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    adminUserId = user.id;
  }

  const body = await req.json().catch(() => ({}));
  let { event_id } = body;
  const dryRun = body?.dry_run === true;

  // Chamada externa: busca evento ativo automaticamente
  if (!event_id && isExternalCall) {
    const now = new Date();
    const { data: activeEvent } = await adminSupabase
      .from("events")
      .select("id, event_date, picks_lock_at, ufc_stats_url")
      .in("status", ["upcoming", "live"])
      .not("ufc_stats_url", "is", null)
      .gte("event_date", getPublicEventCutoffIso(now))
      .order("event_date", { ascending: true })
      .limit(1)
      .single();

    if (!activeEvent)
      return NextResponse.json({ ok: true, message: "Nenhum evento ativo" });

    const lockAt = new Date(activeEvent.picks_lock_at);
    const endAt = new Date(
      new Date(activeEvent.event_date).getTime() + 6 * 60 * 60 * 1000,
    );
    if (now < lockAt || now > endAt)
      return NextResponse.json({
        ok: true,
        message: "Fora da janela do evento",
      });

    event_id = activeEvent.id;
  }

  if (!event_id)
    return NextResponse.json(
      { error: "event_id obrigatório" },
      { status: 400 },
    );
  // Busca ufc_stats_url do próprio evento
  const { data: event } = await adminSupabase
    .from("events")
    .select("slug, ufc_stats_url")
    .eq("id", event_id)
    .single();

  const ufc_stats_url = event?.ufc_stats_url;
  if (!ufc_stats_url)
    return NextResponse.json(
      {
        error:
          "URL do UFCStats não configurada para este evento. Adicione em Novo Evento.",
      },
      { status: 400 },
    );
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
  if (!isAllowedScrapeUrl(ufc_stats_url)) {
    return NextResponse.json(
      { error: "Host não permitido para scraping" },
      { status: 400 },
    );
  }

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
  const remainingResults = [...ufcResults];

  for (const fight of fights) {
    if (fight.result_confirmed) continue;

    const fa = (fight.fighter_a as any)?.name as string;
    const fb = (fight.fighter_b as any)?.name as string;
    const faId = (fight.fighter_a as any)?.id as string;
    const fbId = (fight.fighter_b as any)?.id as string;
    if (!fa || !fb) continue;

    const resultIndex = remainingResults.findIndex(
      (r) =>
        (namesMatch(r.winner, fa) || namesMatch(r.winner, fb)) &&
        (namesMatch(r.loser, fa) || namesMatch(r.loser, fb)),
    );
    if (resultIndex < 0) continue;

    const [ufc] = remainingResults.splice(resultIndex, 1);

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
      ufc_names: ufcResults.map((r) => `${r.winner} vs ${r.loser}`),
    });
  }

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      message: `${updates.length} resultado(s) prontos para importar`,
      results: updates.map((update) => update.label),
      ufc_results_count: ufcResults.length,
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

  const lifecycle = await completeEventIfAllResultsConfirmed(adminSupabase, event_id);

  revalidatePath("/ranking");
  revalidatePath("/home");
  revalidatePath("/admin");
  revalidateTag(CACHE_TAGS.ranking);
  revalidateTag(CACHE_TAGS.events);
  Array.from(slugsToRevalidate).forEach((slug) => {
    revalidatePath(`/event/${slug}`);
  });

  await logAdminAction(adminSupabase, {
    userId: adminUserId || null,
    action: "admin_sync_results",
    details: {
      event_id,
      imported_count: saved,
      scraped_count: ufcResults.length,
      event_slug: event?.slug || null,
      event_completed: lifecycle.completed,
      next_event_id: lifecycle.nextEvent?.id || null,
    },
  });

  return NextResponse.json({
    ok: true,
    message: `${saved} resultado(s) importado(s) e picks pontuados`,
    results: savedLabels,
    event_completed: lifecycle.completed,
    next_event: lifecycle.nextEvent,
  });
}

interface Update {
  fight_id: string;
  winner_id: string;
  method: SyncedResultMethod;
  round: number;
  label: string;
  eventSlug: string | undefined;
}
