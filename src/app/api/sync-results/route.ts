export const dynamic = "force-dynamic";

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  RESULT_POLLING_SAFETY_HOURS,
  getResultPollingWindow,
  shouldPollFightResults,
} from "@/lib/result-polling";
import {
  fetchUfcStatsHtml,
  parseUfcStatsEventResults,
  type UfcStatsResult,
} from "@/lib/ufc-results-sync";
import {
  buildResultConsensusUpdates,
  parseUfcOfficialEventResults,
  type ConsensusUpdate,
  type ResultSourceSet,
} from "@/lib/fight-result-sources";
import {
  extractUfcLiveEventId,
  fetchUfcLiveEvent,
  type UfcLiveEvent,
} from "@/lib/ufc-live-api";
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
import {
  dispatchFightResultAlerts,
  dispatchLiveFightAlerts,
} from "@/server/services/live-fight-alerts";
import {
  getResultSyncLogPolicy,
  RESULT_SYNC_ALERT_INTERVAL_SECONDS,
} from "@/server/services/result-sync-logging";

type ResultSyncEvent = {
  id: string;
  slug: string;
  name: string;
  event_date?: string | null;
  prelims_start_at?: string | null;
  status?: string | null;
  ufc_event_id?: string | null;
  ufc_stats_url?: string | null;
};

const RESULT_SOURCE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};
const RESULT_SOURCE_TIMEOUT_MS = 9_000;

const EVENT_RESULT_SOURCE_SELECT = `
  id,
  slug,
  name,
  event_date,
  prelims_start_at,
  status,
  ufc_event_id,
  ufc_stats_url
`;

async function scrapeUfcStats(url: string): Promise<UfcStatsResult[]> {
  const signal = AbortSignal.timeout(RESULT_SOURCE_TIMEOUT_MS);
  const html = await fetchUfcStatsHtml(url, (input, init) =>
    fetch(input, { ...init, signal }),
  );
  return parseUfcStatsEventResults(html);
}

async function fetchResultHtml(url: string, signal: AbortSignal) {
  const response = await fetch(url, {
    headers: RESULT_SOURCE_HEADERS,
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function looksLikeBotChallenge(html: string) {
  return /Just a moment|Checking your browser|cf-chl|cloudflare/i.test(html);
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
): Promise<{ source: ResultSourceSet | null; officialEvent: UfcLiveEvent | null }> {
  const candidates = await resolveEventUrlCandidates(event);
  const attempted: ResultSourceSet[] = [];
  let officialEvent: UfcLiveEvent | null = null;
  const signal = AbortSignal.timeout(RESULT_SOURCE_TIMEOUT_MS);

  for (const url of candidates) {
    if (!isAllowedScrapeUrl(url)) continue;

    try {
      const html = await fetchResultHtml(url, signal);
      if (looksLikeBotChallenge(html)) {
        attempted.push({
          source: "ufc",
          label: "UFC.com",
          url,
          results: [],
          error: "desafio anti-bot detectado",
        });
        continue;
      }

      const liveEventId = extractUfcLiveEventId(html);
      if (liveEventId) {
        try {
          const official = await fetchUfcLiveEvent(liveEventId, { signal });
          officialEvent = official.event;
          const source: ResultSourceSet = {
            source: "ufc",
            label: "UFC API oficial",
            url: official.url,
            results: official.event.results,
            error: official.event.results.length
              ? null
              : `evento ${official.event.status}; sem resultados publicados`,
          };
          if (source.results.length) return { source, officialEvent };
          attempted.push(source);
          continue;
        } catch (error) {
          attempted.push({
            source: "ufc",
            label: "UFC API oficial",
            url,
            results: [],
            error: error instanceof Error ? error.message : "falha na API oficial",
          });
        }
      }

      const htmlResults = parseUfcOfficialEventResults(html);
      const source: ResultSourceSet = {
        source: "ufc",
        label: "UFC.com",
        url,
        results: htmlResults,
        error: htmlResults.length ? null : "sem resultados publicados",
      };
      if (source.results.length) return { source, officialEvent };
      attempted.push(source);
    } catch (error) {
      attempted.push({
        source: "ufc",
        label: "UFC.com",
        url,
        results: [],
        error: error instanceof Error ? error.message : "falha ao buscar UFC.com",
      });
    }
  }

  return { source: attempted[0] || null, officialEvent };
}

async function collectResultSources(event: ResultSyncEvent) {
  const [stats, official] = await Promise.all([
    event.ufc_stats_url
      ? scrapeUfcStatsSource(event.ufc_stats_url)
      : Promise.resolve(null),
    scrapeOfficialUfcSource(event),
  ]);
  const sources: ResultSourceSet[] = [];
  if (stats) sources.push(stats);
  if (official.source) sources.push(official.source);

  return { sources, officialEvent: official.officialEvent };
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
  minIntervalSeconds = 0,
) {
  try {
    if (minIntervalSeconds > 0) {
      await adminSupabase.rpc("record_rate_limited_activity_log", {
        p_action: "admin_sync_results",
        p_details: details,
        p_min_interval_seconds: minIntervalSeconds,
      });
    } else {
      await adminSupabase.from("activity_logs").insert({
        user_id: null,
        action: "admin_sync_results",
        details,
      });
    }
  } catch {
    // não quebra o fluxo
  }
}

type Update = ConsensusUpdate;

// ─── Monitoramento ───────────────────────────────────────────
async function countConsecutiveSyncFailures(
  adminSupabase: any,
  eventId?: string,
): Promise<number> {
  try {
    let query = adminSupabase
      .from("activity_logs")
      .select("details")
      .eq("action", "admin_sync_results")
      .order("created_at", { ascending: false })
      .limit(5);
    if (eventId) query = query.eq("details->>event_id", eventId);
    const { data: logs } = await query;

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
    const failures = await countConsecutiveSyncFailures(adminSupabase, eventId);
    if (failures >= 3) {
      await adminSupabase.rpc("record_rate_limited_activity_log", {
        p_action: "admin_sync_alert",
        p_details: {
          type: "consecutive_failures",
          count: failures,
          step: currentStep,
          event_id: eventId || null,
        },
        p_min_interval_seconds: RESULT_SYNC_ALERT_INTERVAL_SECONDS,
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
  const startedAt = Date.now();
  const requestId = randomUUID();
  let adminUserId: string | null = null;

  const authHeader = req.headers.get("authorization");
  const syncSecret = process.env.SYNC_SECRET;
  const isExternalCall = syncSecret && authHeader === `Bearer ${syncSecret}`;
  const logAttempt = (details: Record<string, unknown>) => {
    const step = String(details.step || "");
    const policy = getResultSyncLogPolicy(step, !!isExternalCall);
    if (!policy.record) return Promise.resolve();
    return logSyncAttempt(
      adminSupabase,
      {
        request_id: requestId,
        duration_ms: Date.now() - startedAt,
        ...details,
      },
      policy.minIntervalSeconds,
    );
  };

  await logAttempt({
    step: "received",
    is_external: !!isExternalCall,
    has_auth: !!authHeader,
    has_secret: !!syncSecret,
  });

  if (!isExternalCall) {
    try {
      assertSameOriginForMutation(req);
    } catch {
      await logAttempt({
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
      await logAttempt({
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
      await logAttempt({
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
        prelims_start_at,
        status,
        ufc_event_id,
        ufc_stats_url
      `,
      )
      .in("status", ["upcoming", "live"])
      .or(
        "ufc_stats_url.not.is.null,ufc_event_id.not.is.null",
      )
      .gte(
        "event_date",
        new Date(
          now.getTime() - RESULT_POLLING_SAFETY_HOURS * 60 * 60 * 1000,
        ).toISOString(),
      )
      .order("event_date", { ascending: true })
      .limit(1)
      .single();

    if (!activeEvent) {
      await logAttempt({
        step: "no_active_event",
        is_external: true,
      });
      return NextResponse.json({
        ok: true,
        message: "Nenhum evento ativo",
        should_continue: false,
      });
    }

    if (!shouldPollFightResults(activeEvent, now)) {
      await logAttempt({
        step: "outside_window",
        is_external: true,
        event_id: activeEvent.id,
        polling_window: getResultPollingWindow(activeEvent),
        event_date: activeEvent.event_date,
      });
      return NextResponse.json({
        ok: true,
        message: "Fora da janela do evento",
        should_continue: false,
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
    await logAttempt({
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
    await logAttempt({
      step: "event_not_found",
      event_id,
      is_external: !!isExternalCall,
    });
    return NextResponse.json(
      { error: "Evento não encontrado" },
      { status: 404 },
    );
  }

  if (isExternalCall && !shouldPollFightResults(event)) {
    await logAttempt({
      step: "outside_window",
      is_external: true,
      event_id,
      polling_window: getResultPollingWindow(event),
    });
    return NextResponse.json({
      ok: true,
      message: "Fora da janela do evento",
      should_continue: false,
    });
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
    await logAttempt({
      step: "no_fights",
      event_id,
      is_external: !!isExternalCall,
    });
    return NextResponse.json(
      { error: "Nenhuma luta encontrada" },
      { status: 404 },
    );
  }

  if (fights.every((fight) => fight.result_confirmed)) {
    const lifecycle = await completeEventIfAllResultsConfirmed(adminSupabase, event_id);
    revalidateTag(CACHE_TAGS.events, "max");
    revalidatePath("/home");
    revalidatePath("/admin");
    revalidatePath("/ranking");
    return NextResponse.json({
      ok: true,
      message: "Todos os resultados já foram computados",
      event_completed: lifecycle.completed || event.status === "completed",
      should_continue: false,
    });
  }

  const { sources: resultSources, officialEvent } = await collectResultSources(
    event as ResultSyncEvent,
  );
  const diagnostics = sourceDiagnostics(resultSources);
  let liveAlerts = null;
  if (isExternalCall && officialEvent) {
    try {
      liveAlerts = await dispatchLiveFightAlerts(
        adminSupabase,
        {
          id: event.id,
          name: event.name,
          slug: event.slug,
          fights: fights as any,
        },
        officialEvent,
      );
    } catch (error) {
      await logAttempt({
        step: "fight_alerts_failed",
        event_id,
        is_external: true,
        error: error instanceof Error ? error.message : "falha nos alertas ao vivo",
      });
    }
  }
  const scrapedCount = resultSources.reduce(
    (count, source) => count + source.results.length,
    0,
  );

  if (!scrapedCount) {
    await logAttempt({
      step: "no_scraped_results",
      event_id,
      event_slug: event?.slug || null,
      is_external: !!isExternalCall,
      sources: diagnostics,
      live_alerts: liveAlerts,
      should_continue: true,
    });
    await checkSyncFailures(adminSupabase, "no_scraped_results", event_id);
    return NextResponse.json({
      ok: true,
      message:
        "Nenhum resultado disponível nas fontes configuradas ainda — tente em breve",
      sources: diagnostics,
      live_alerts: liveAlerts,
      should_continue: true,
    });
  }

  const consensus = buildResultConsensusUpdates(fights as any[], resultSources);
  const updates: Update[] = consensus.updates;

  if (!updates.length) {
    await logAttempt({
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
      live_alerts: liveAlerts,
      should_continue: true,
      source_names: resultSources.flatMap((source) =>
        source.results.map((result) => ({
          source: source.source,
          label: `${result.winner} vs ${result.loser}`,
        })),
      ),
    });
  }

  if (dryRun) {
    await logAttempt({
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
      live_alerts: liveAlerts,
      should_continue: true,
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
    await logAttempt({
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
  let resultAlerts = null;
  if (saved > 0) {
    try {
      resultAlerts = await dispatchFightResultAlerts(
        adminSupabase,
        { id: event.id, name: event.name, slug: event.slug },
        updates.slice(0, saved),
        fights as any[],
      );
    } catch (error) {
      await logAttempt({
        step: "fight_result_alerts_failed",
        event_id,
        error:
          error instanceof Error
            ? error.message
            : "falha nos alertas de resultado",
      });
    }
  }
  const slugsToRevalidate = new Set<string>();
  updates.slice(0, saved).forEach((upd) => {
    if (upd.eventSlug) slugsToRevalidate.add(upd.eventSlug);
  });

  const lifecycle = await completeEventIfAllResultsConfirmed(adminSupabase, event_id);

  revalidatePath("/ranking");
  revalidatePath("/home");
  revalidatePath("/admin");
  revalidateTag(CACHE_TAGS.ranking, "max");
  revalidateTag(CACHE_TAGS.events, "max");
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
        request_id: requestId,
        duration_ms: Date.now() - startedAt,
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
    live_alerts: liveAlerts,
    result_alerts: resultAlerts,
    should_continue: !lifecycle.completed,
  });
}
