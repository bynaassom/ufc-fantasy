export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getPublicEventCutoffIso } from "@/lib/event-sequence";
import {
  fetchUfcStatsHtml,
  parseUfcStatsEventResults,
  type UfcStatsResult,
} from "@/lib/ufc-results-sync";
import {
  buildResultConsensusUpdates,
  parseEspnFightCenterResults,
  parseSherdogEventResults,
  parseTapologyEventResults,
  parseUfcOfficialEventResults,
  type ConsensusUpdate,
  type ResultSourceId,
  type ResultSourceSet,
} from "@/lib/fight-result-sources";
import { resolveEventUrlCandidates } from "@/lib/ufc-card-sync";
import { isAllowedScrapeUrl } from "@/lib/security";
import { blockedResultSource } from "@/lib/result-source-url";
import {
  extractResultSyncEventId,
  resultSyncRequestDiagnostics,
} from "@/lib/result-sync-request";
import { logAdminAction } from "@/lib/admin-audit";
import { assertSameOriginForMutation } from "@/server/api";
import { CACHE_TAGS } from "@/server/cache-tags";
import { completeEventIfAllResultsConfirmed } from "@/server/services/event-lifecycle";
import { awardEventXpForAllUsers } from "@/server/services/xp";

type ResultSyncEvent = {
  slug?: string | null;
  name?: string | null;
  event_date?: string | null;
  ufc_event_id?: string | null;
  ufc_stats_url?: string | null;
  espn_fightcenter_url?: string | null;
  sherdog_event_url?: string | null;
  tapology_event_url?: string | null;
};

const RESULT_SOURCE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

const EVENT_RESULT_SOURCE_SELECT = `
  slug,
  name,
  event_date,
  ufc_event_id,
  ufc_stats_url,
  espn_fightcenter_url,
  sherdog_event_url,
  tapology_event_url
`;

async function scrapeUfcStats(url: string): Promise<UfcStatsResult[]> {
  const html = await fetchUfcStatsHtml(url);
  return parseUfcStatsEventResults(html);
}

async function fetchResultHtml(url: string) {
  const response = await fetch(url, {
    headers: RESULT_SOURCE_HEADERS,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function looksLikeBotChallenge(html: string) {
  return /Just a moment|Checking your browser|cf-chl|cloudflare/i.test(html);
}

async function scrapeSource(
  source: ResultSourceId,
  label: string,
  url: string,
  parser: (html: string) => UfcStatsResult[],
): Promise<ResultSourceSet> {
  const blockedSource = blockedResultSource(source, label, url);
  if (blockedSource) return blockedSource;

  try {
    const html = await fetchResultHtml(url);
    if (looksLikeBotChallenge(html)) {
      return {
        source,
        label,
        url,
        results: [],
        error: "desafio anti-bot detectado",
      };
    }

    const results = parser(html);
    return {
      source,
      label,
      url,
      results,
      error: results.length ? null : "sem resultados publicados",
    };
  } catch (error: any) {
    return {
      source,
      label,
      url,
      results: [],
      error: error?.message || "falha ao buscar fonte",
    };
  }
}

async function scrapeUfcStatsSource(url: string): Promise<ResultSourceSet> {
  const blockedSource = blockedResultSource("ufcstats", "UFCStats", url);
  if (blockedSource) return blockedSource;

  try {
    const results = await scrapeUfcStats(url);
    return {
      source: "ufcstats",
      label: "UFCStats",
      url,
      results,
      error: results.length ? null : "sem resultados publicados",
    };
  } catch (error: any) {
    return {
      source: "ufcstats",
      label: "UFCStats",
      url,
      results: [],
      error: error?.message || "falha ao buscar UFCStats",
    };
  }
}

async function scrapeOfficialUfcSource(
  event: ResultSyncEvent,
): Promise<ResultSourceSet | null> {
  const candidates = await resolveEventUrlCandidates(event);
  const attempted: ResultSourceSet[] = [];

  for (const url of candidates) {
    if (!isAllowedScrapeUrl(url)) continue;

    const source = await scrapeSource(
      "ufc",
      "UFC.com",
      url,
      parseUfcOfficialEventResults,
    );
    if (source.results.length) return source;
    attempted.push(source);
  }

  return attempted[0] || null;
}

async function collectResultSources(event: ResultSyncEvent) {
  const sources: ResultSourceSet[] = [];

  if (event.ufc_stats_url) {
    sources.push(await scrapeUfcStatsSource(event.ufc_stats_url));
  }

  const officialUfcSource = await scrapeOfficialUfcSource(event);
  if (officialUfcSource) sources.push(officialUfcSource);

  if (event.espn_fightcenter_url) {
    sources.push(
      await scrapeSource(
        "espn",
        "ESPN FightCenter",
        event.espn_fightcenter_url,
        parseEspnFightCenterResults,
      ),
    );
  }

  if (event.sherdog_event_url) {
    sources.push(
      await scrapeSource(
        "sherdog",
        "Sherdog",
        event.sherdog_event_url,
        parseSherdogEventResults,
      ),
    );
  }

  if (event.tapology_event_url) {
    sources.push(
      await scrapeSource(
        "tapology",
        "Tapology",
        event.tapology_event_url,
        parseTapologyEventResults,
      ),
    );
  }

  return sources;
}

function sourceDiagnostics(sourceSets: ResultSourceSet[]) {
  return sourceSets.map((source) => ({
    source: source.source,
    label: source.label,
    url: source.url || null,
    results_count: source.results.length,
    error: source.error || null,
  }));
}

// ─── Helpers ─────────────────────────────────────────────────
async function logSyncAttempt(
  adminSupabase: any,
  details: Record<string, unknown>,
) {
  try {
    await adminSupabase.from("activity_logs").insert({
      user_id: null,
      action: "admin_sync_results",
      details,
    });
  } catch {
    // não quebra o fluxo
  }
}

type Update = ConsensusUpdate;

// ─── Monitoramento ───────────────────────────────────────────
async function countConsecutiveSyncFailures(adminSupabase: any): Promise<number> {
  try {
    const { data: logs } = await adminSupabase
      .from("activity_logs")
      .select("details")
      .eq("action", "admin_sync_results")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!logs?.length) return 0;

    let consecutive = 0;
    for (const log of logs) {
      const step = log.details?.step;
      if (step === "no_scraped_results" || step === "no_consensus" || step === "no_active_event") {
        consecutive++;
      } else if (step === "complete") {
        break;
      } else {
        break;
      }
    }
    return consecutive;
  } catch {
    return 0;
  }
}

async function checkSyncFailures(adminSupabase: any, currentStep: string, eventId?: string) {
  try {
    const failures = await countConsecutiveSyncFailures(adminSupabase);
    if (failures >= 3) {
      await adminSupabase.from("activity_logs").insert({
        user_id: null,
        action: "admin_sync_alert",
        details: {
          type: "consecutive_failures",
          count: failures,
          step: currentStep,
          event_id: eventId || null,
        },
      });
    }
  } catch { /* silent */ }
}

// ─── Handlers ─────────────────────────────────────────────────
export async function GET() {
  return NextResponse.json(
    { error: "Use POST com SYNC_SECRET no header Authorization" },
    { status: 405 },
  );
}

export async function POST(req: NextRequest) {
  const adminSupabase = await createAdminClient();
  let adminUserId: string | null = null;

  const authHeader = req.headers.get("authorization");
  const syncSecret = process.env.SYNC_SECRET;
  const isExternalCall = syncSecret && authHeader === `Bearer ${syncSecret}`;

  await logSyncAttempt(adminSupabase, {
    step: "received",
    is_external: !!isExternalCall,
    has_auth: !!authHeader,
    has_secret: !!syncSecret,
  });

  if (!isExternalCall) {
    try {
      assertSameOriginForMutation(req);
    } catch {
      await logSyncAttempt(adminSupabase, {
        step: "rejected",
        reason: "cross_origin",
        is_external: false,
      });
      return NextResponse.json({ error: "Cross-origin não permitido" }, { status: 403 });
    }
  }

  if (!isExternalCall) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      await logSyncAttempt(adminSupabase, {
        step: "rejected",
        reason: "no_session",
        is_external: false,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role, is_banned")
      .eq("id", user.id)
      .single();
    if (!profile || profile.role !== "admin" || profile.is_banned) {
      await logSyncAttempt(adminSupabase, {
        step: "rejected",
        reason: "not_admin",
        user_id: user.id,
        is_external: false,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    adminUserId = user.id;
  }

  const body = await req.json().catch(() => ({}));
  let event_id = extractResultSyncEventId(body, req.url);
  const dryRun = body?.dry_run === true;

  // Chamada externa: busca evento ativo automaticamente
  if (!event_id && isExternalCall) {
    const now = new Date();
    const { data: activeEvent } = await adminSupabase
      .from("events")
      .select(
        `
        id,
        event_date,
        picks_lock_at,
        ufc_event_id,
        ufc_stats_url,
        espn_fightcenter_url,
        sherdog_event_url,
        tapology_event_url
      `,
      )
      .in("status", ["upcoming", "live"])
      .or(
        "ufc_stats_url.not.is.null,ufc_event_id.not.is.null,espn_fightcenter_url.not.is.null,sherdog_event_url.not.is.null,tapology_event_url.not.is.null",
      )
      .gte("event_date", getPublicEventCutoffIso(now))
      .order("event_date", { ascending: true })
      .limit(1)
      .single();

    if (!activeEvent) {
      await logSyncAttempt(adminSupabase, {
        step: "no_active_event",
        is_external: true,
      });
      return NextResponse.json({ ok: true, message: "Nenhum evento ativo" });
    }

    const lockAt = new Date(activeEvent.picks_lock_at);
    const endAt = new Date(
      new Date(activeEvent.event_date).getTime() + 6 * 60 * 60 * 1000,
    );
    if (now < lockAt || now > endAt) {
      await logSyncAttempt(adminSupabase, {
        step: "outside_window",
        is_external: true,
        event_id: activeEvent.id,
        picks_lock_at: activeEvent.picks_lock_at,
        event_date: activeEvent.event_date,
      });
      return NextResponse.json({
        ok: true,
        message: "Fora da janela do evento",
      });
    }

    event_id = activeEvent.id;
  }

  if (!event_id) {
    const diag = resultSyncRequestDiagnostics({
      body,
      isExternalCall: !!isExternalCall,
      authHeader,
      syncSecret,
    });
    await logSyncAttempt(adminSupabase, {
      step: "no_event_id",
      is_external: !!isExternalCall,
      diagnostics: diag,
    });
    return NextResponse.json(
      { error: "event_id obrigatório", details: diag },
      { status: 400 },
    );
  }

  const { data: event } = await adminSupabase
    .from("events")
    .select(EVENT_RESULT_SOURCE_SELECT)
    .eq("id", event_id)
    .single();

  if (!event) {
    await logSyncAttempt(adminSupabase, {
      step: "event_not_found",
      event_id,
      is_external: !!isExternalCall,
    });
    return NextResponse.json(
      { error: "Evento não encontrado" },
      { status: 404 },
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

  if (!fights?.length) {
    await logSyncAttempt(adminSupabase, {
      step: "no_fights",
      event_id,
      is_external: !!isExternalCall,
    });
    return NextResponse.json(
      { error: "Nenhuma luta encontrada" },
      { status: 404 },
    );
  }

  const resultSources = await collectResultSources(event);
  const diagnostics = sourceDiagnostics(resultSources);
  const scrapedCount = resultSources.reduce(
    (count, source) => count + source.results.length,
    0,
  );

  if (!scrapedCount) {
    await logSyncAttempt(adminSupabase, {
      step: "no_scraped_results",
      event_id,
      event_slug: event?.slug || null,
      is_external: !!isExternalCall,
      sources: diagnostics,
    });
    await checkSyncFailures(adminSupabase, "no_scraped_results", event_id);
    return NextResponse.json({
      ok: true,
      message:
        "Nenhum resultado disponível nas fontes configuradas ainda — tente em breve",
      sources: diagnostics,
    });
  }

  const consensus = buildResultConsensusUpdates(fights as any[], resultSources);
  const updates: Update[] = consensus.updates;

  if (!updates.length) {
    await logSyncAttempt(adminSupabase, {
      step: "no_consensus",
      event_id,
      event_slug: event?.slug || null,
      scraped_count: scrapedCount,
      conflicts: consensus.conflicts.length,
      is_external: !!isExternalCall,
      sources: diagnostics,
    });
    await checkSyncFailures(adminSupabase, "no_consensus", event_id);
    return NextResponse.json({
      ok: true,
      message: consensus.conflicts.length
        ? "Fontes divergentes encontradas — revise antes de importar"
        : `${scrapedCount} resultado(s) encontrados, mas nenhum consenso casa com lutas pendentes`,
      sources: diagnostics,
      conflicts: consensus.conflicts,
      source_names: resultSources.flatMap((source) =>
        source.results.map((result) => ({
          source: source.source,
          label: `${result.winner} vs ${result.loser}`,
        })),
      ),
    });
  }

  if (dryRun) {
    await logSyncAttempt(adminSupabase, {
      step: "dry_run",
      event_id,
      event_slug: event?.slug || null,
      updates: updates.length,
      is_external: !!isExternalCall,
    });
    return NextResponse.json({
      ok: true,
      dry_run: true,
      message: `${updates.length} resultado(s) prontos para importar`,
      results: updates.map((update) => update.label),
      sources: diagnostics,
      conflicts: consensus.conflicts,
      results_count: scrapedCount,
    });
  }

  const resultsBatch = updates.map((upd) => ({
    fight_id: upd.fight_id,
    winner_id: upd.winner_id,
    method: upd.method,
    round: upd.round,
  }));

  const { data: rpcResult, error: rpcError } = await adminSupabase.rpc(
    "sync_fight_results_batch",
    { results: resultsBatch },
  );

  if (rpcError) {
    await logSyncAttempt(adminSupabase, {
      step: "transaction_failed",
      event_id,
      event_slug: event?.slug || null,
      is_external: !!isExternalCall,
      updates: resultsBatch.length,
      error: {
        message: rpcError.message,
        details: rpcError.details || null,
        hint: rpcError.hint || null,
        code: rpcError.code || null,
      },
    });
    return NextResponse.json(
      {
        error: `Falha na transação: ${rpcError.message}`,
        details: rpcError.details || null,
        hint: rpcError.hint || null,
        code: rpcError.code || null,
      },
      { status: 500 },
    );
  }

  const saved = typeof rpcResult === "number" ? rpcResult : 0;
  const savedLabels: string[] = updates.slice(0, saved).map((upd) => upd.label);
  const slugsToRevalidate = new Set<string>();
  updates.slice(0, saved).forEach((upd) => {
    if (upd.eventSlug) slugsToRevalidate.add(upd.eventSlug);
  });

  const lifecycle = await completeEventIfAllResultsConfirmed(adminSupabase, event_id);

  if (lifecycle.completed) {
    try {
      const xpResult = await awardEventXpForAllUsers(event_id);
      console.log(
        `[sync-results] Awarded XP for event ${event_id}: ${xpResult.awarded} awards to ${xpResult.usersAffected.length} users`,
      );
    } catch (err) {
      console.error(`[sync-results] Failed to award XP for event ${event_id}`, err);
    }
  }

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
        scraped_count: scrapedCount,
        sources: diagnostics,
        conflicts: consensus.conflicts,
        event_slug: event?.slug || null,
        event_completed: lifecycle.completed,
        next_event_id: lifecycle.nextEvent?.id || null,
        step: "complete",
    },
  });

  return NextResponse.json({
    ok: true,
    message: `${saved} resultado(s) importado(s) e picks pontuados`,
    results: savedLabels,
    sources: diagnostics,
    conflicts: consensus.conflicts,
    event_completed: lifecycle.completed,
    next_event: lifecycle.nextEvent,
  });
}
