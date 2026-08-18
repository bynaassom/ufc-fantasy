export const dynamic = "force-dynamic";

import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  UFCEvent,
  fetchUpcomingUFCEvents,
  fetchUpcomingUFCEventsFromPage,
  resolveSyncedEventBannerUrl,
} from "@/lib/ufc-api";
import { logAdminAction } from "@/lib/admin-audit";
import { syncScrapedCardForEvent } from "@/lib/ufc-card-sync";
import { discoverUfcStatsUrl } from "@/lib/ufc-stats-discovery";
import { assertSameOriginForMutation } from "@/server/api";
import { CACHE_TAGS } from "@/server/cache-tags";
import { getAutomatedEventTiming } from "@/lib/event-timing";
import { getSafeSyncedEventStatus } from "@/lib/event-lifecycle";
import { syncUfcOddsForEvent } from "@/server/services/ufc-odds";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getEventSlug(upstreamEvent: UFCEvent) {
  if (upstreamEvent.eventUrl) {
    try {
      const parsed = new URL(upstreamEvent.eventUrl);
      const match = parsed.pathname.match(/\/event\/([^/?#]+)/i);
      if (match?.[1]) {
        return match[1].toLowerCase();
      }
    } catch {
      // fallback below
    }
  }

  const numberedEvent = upstreamEvent.name.match(/^UFC\s+(\d+)\b/i);
  if (numberedEvent?.[1]) {
    return `ufc-${numberedEvent[1]}`;
  }

  return slugify(upstreamEvent.name);
}

function toIsoOrNull(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function getDateKey(iso: string) {
  return iso.slice(0, 10);
}

function getMatchupKey(name: string) {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const parts = normalized.split(/[:|]/).map((part) => part.trim()).filter(Boolean);
  const candidate = parts.length > 1 ? parts[parts.length - 1] : normalized;

  return candidate
    .replace(/\bversus\b/g, "vs")
    .replace(/\bx\b/g, "vs")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type ExistingEvent = {
  id: string;
  name: string;
  slug: string;
  ufc_event_id?: string | null;
  event_date: string;
  prelims_start_at?: string | null;
  timing_mode?: "automatic" | "manual" | null;
  location?: string | null;
  banner_image_url?: string | null;
  picks_lock_at?: string | null;
  picks_open_at?: string | null;
  status?: "upcoming" | "live" | "completed" | null;
};

type SyncAction = "create" | "update" | "unchanged";
type MatchStrategy =
  | "ufc_event_id"
  | "slug"
  | "date_matchup"
  | "matchup_time_window"
  | "date_only"
  | null;

type SyncCandidate = {
  source_id: string;
  name: string;
  slug: string;
  event_url: string;
  event_date: string;
  prelims_start_at: string | null;
  timing_mode: "automatic" | "manual";
  location: string;
  banner_image_url: string | null;
  picks_lock_at: string;
  picks_open_at: string;
  status: "upcoming" | "live" | "completed";
  action: SyncAction;
  matched_by: MatchStrategy;
  existing_event: Pick<
    ExistingEvent,
    "id" | "name" | "slug" | "event_date" | "ufc_event_id"
  > | null;
};

async function requireAdmin(req?: NextRequest) {
  if (req) {
    const authHeader = req.headers.get("authorization");
    const syncSecret = process.env.SYNC_SECRET;
    const isExternalCall = syncSecret && authHeader === `Bearer ${syncSecret}`;
    if (isExternalCall) {
      const adminSupabase = await createAdminClient();
      return { adminSupabase, userId: null, isExternal: true };
    }
  }

  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role, is_banned")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || profile.is_banned) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { adminSupabase, userId: user.id, isExternal: false };
}

async function loadExistingEvents(adminSupabase: Awaited<ReturnType<typeof createAdminClient>>) {
  const { data, error } = await adminSupabase
    .from("events")
    .select(
      "id, name, slug, ufc_event_id, event_date, prelims_start_at, timing_mode, location, banner_image_url, picks_lock_at, picks_open_at, status",
    )
    .order("event_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as ExistingEvent[];
}

function mergeUpstreamEventSources(apiEvents: UFCEvent[], pageEvents: UFCEvent[]) {
  const pageByDateMatchup = new Map<string, UFCEvent>();
  const pageByMatchup = new Map<string, UFCEvent[]>();

  for (const event of pageEvents) {
    const key = `${getDateKey(event.date)}:${getMatchupKey(event.name)}`;
    pageByDateMatchup.set(key, event);

    const matchupKey = getMatchupKey(event.name);
    const current = pageByMatchup.get(matchupKey) || [];
    current.push(event);
    pageByMatchup.set(matchupKey, current);
  }

  return apiEvents.map((event) => {
    const directMatch = pageByDateMatchup.get(
      `${getDateKey(event.date)}:${getMatchupKey(event.name)}`,
    );

    let nearestMatch = directMatch || null;
    if (!nearestMatch) {
      const matchupCandidates = pageByMatchup.get(getMatchupKey(event.name)) || [];
      const eventTime = new Date(event.date).getTime();
      const nearest = matchupCandidates
        .map((candidate) => ({
          candidate,
          diff: Math.abs(new Date(candidate.date).getTime() - eventTime),
        }))
        .sort((a, b) => a.diff - b.diff)[0];

      if (nearest && nearest.diff <= 12 * 60 * 60 * 1000) {
        nearestMatch = nearest.candidate;
      }
    }

    return {
      ...event,
      name: directMatch?.name || event.name,
      location: event.location || nearestMatch?.location || "",
      image: event.image || nearestMatch?.image,
      eventUrl:
        event.eventUrl ||
        nearestMatch?.eventUrl ||
        `https://www.ufc.com.br/event/${slugify(event.name)}`,
      prelimsStartAt: event.prelimsStartAt || nearestMatch?.prelimsStartAt,
    };
  });
}

function buildSyncPlan(
  upstreamEvents: UFCEvent[],
  existingEvents: ExistingEvent[],
) {
  const byUfcId = new Map<string, ExistingEvent>();
  const bySlug = new Map<string, ExistingEvent>();
  const byDateMatchup = new Map<string, ExistingEvent>();
  const byMatchup = new Map<string, ExistingEvent[]>();
  const byDate = new Map<string, ExistingEvent[]>();

  for (const event of existingEvents) {
    const eventDate = toIsoOrNull(event.event_date);
    if (!eventDate) continue;

    if (event.ufc_event_id) byUfcId.set(event.ufc_event_id, event);
    bySlug.set(event.slug, event);

    const dateKey = getDateKey(eventDate);
    const matchupKey = getMatchupKey(event.name);
    if (matchupKey) {
      byDateMatchup.set(`${dateKey}:${matchupKey}`, event);
      const eventsForMatchup = byMatchup.get(matchupKey) || [];
      eventsForMatchup.push(event);
      byMatchup.set(matchupKey, eventsForMatchup);
    }

    const eventsForDate = byDate.get(dateKey) || [];
    eventsForDate.push(event);
    byDate.set(dateKey, eventsForDate);
  }

  const candidates: SyncCandidate[] = [];

  for (const upstreamEvent of upstreamEvents) {
    const eventDate = toIsoOrNull(upstreamEvent.date);
    if (!eventDate) continue;

    const slug = getEventSlug(upstreamEvent);
    const upstreamPrelimsStartAt = toIsoOrNull(upstreamEvent.prelimsStartAt);
    const dateKey = getDateKey(eventDate);
    const matchupKey = getMatchupKey(upstreamEvent.name);
    const upstreamSourceId = upstreamEvent.eventUrl || upstreamEvent.id;

    let matchedBy: MatchStrategy = null;
    let existing =
      byUfcId.get(upstreamSourceId) ||
      bySlug.get(slug) ||
      null;

    if (existing === byUfcId.get(upstreamSourceId) && existing) {
      matchedBy = "ufc_event_id";
    } else if (existing === bySlug.get(slug) && existing) {
      matchedBy = "slug";
    }

    if (!existing && matchupKey) {
      existing = byDateMatchup.get(`${dateKey}:${matchupKey}`) || null;
      if (existing) matchedBy = "date_matchup";
    }

    if (!existing && matchupKey) {
      const eventTime = new Date(eventDate).getTime();
      const matchupCandidates = byMatchup.get(matchupKey) || [];
      const closestMatch = matchupCandidates
        .map((candidate) => ({
          candidate,
          diff: Math.abs(new Date(candidate.event_date).getTime() - eventTime),
        }))
        .sort((a, b) => a.diff - b.diff)[0];

      if (closestMatch && closestMatch.diff <= 12 * 60 * 60 * 1000) {
        existing = closestMatch.candidate;
        matchedBy = "matchup_time_window";
      }
    }

    if (!existing) {
      const sameDateEvents = byDate.get(dateKey) || [];
      if (sameDateEvents.length === 1) {
        existing = sameDateEvents[0];
        matchedBy = "date_only";
      }
    }

    const timingMode: "automatic" | "manual" =
      existing?.timing_mode === "manual" ? "manual" : "automatic";
    const prelimsStartAt =
      timingMode === "manual"
        ? existing?.prelims_start_at || upstreamPrelimsStartAt
        : upstreamPrelimsStartAt;
    const automaticTiming = getAutomatedEventTiming({
      event_date: eventDate,
      prelims_start_at: prelimsStartAt,
    });
    const picksLockAt =
      timingMode === "manual" && existing?.picks_lock_at
        ? existing.picks_lock_at
        : automaticTiming!.picksLockAt;
    const picksOpenAt = existing?.picks_open_at || automaticTiming!.picksOpenAt;

    const payload = {
      name: upstreamEvent.name,
      slug,
      event_date: eventDate,
      prelims_start_at: prelimsStartAt,
      timing_mode: timingMode,
      location: upstreamEvent.location || "",
      banner_image_url: resolveSyncedEventBannerUrl(
        existing?.banner_image_url,
        upstreamEvent.image,
      ),
      ufc_event_id: upstreamSourceId,
      status: getSafeSyncedEventStatus(upstreamEvent.status, existing?.status),
      picks_lock_at: picksLockAt,
      picks_open_at: picksOpenAt,
    };

    const changed =
      !existing ||
      existing.name !== payload.name ||
      existing.slug !== payload.slug ||
      existing.event_date !== payload.event_date ||
      (existing.prelims_start_at || null) !== payload.prelims_start_at ||
      (existing.timing_mode || "automatic") !== payload.timing_mode ||
      (existing.location || "") !== payload.location ||
      (existing.banner_image_url || null) !== payload.banner_image_url ||
      (existing.ufc_event_id || null) !== payload.ufc_event_id ||
      (existing.status || "upcoming") !== payload.status ||
      (existing.picks_lock_at || null) !== payload.picks_lock_at ||
      (existing.picks_open_at || null) !== payload.picks_open_at;

    candidates.push({
      source_id: payload.ufc_event_id,
      name: payload.name,
      slug: payload.slug,
      event_url:
        upstreamEvent.eventUrl || `https://www.ufc.com.br/event/${payload.slug}`,
      event_date: payload.event_date,
      prelims_start_at: payload.prelims_start_at,
      timing_mode: payload.timing_mode,
      location: payload.location,
      banner_image_url: payload.banner_image_url,
      picks_lock_at: payload.picks_lock_at,
      picks_open_at: payload.picks_open_at,
      status: payload.status,
      action: !existing ? "create" : changed ? "update" : "unchanged",
      matched_by: matchedBy,
      existing_event: existing
        ? {
            id: existing.id,
            name: existing.name,
            slug: existing.slug,
            event_date: existing.event_date,
            ufc_event_id: existing.ufc_event_id || null,
          }
        : null,
    });
  }

  return candidates;
}

function summarizePlan(candidates: SyncCandidate[]) {
  const counts = {
    create: candidates.filter((candidate) => candidate.action === "create").length,
    update: candidates.filter((candidate) => candidate.action === "update").length,
    unchanged: candidates.filter((candidate) => candidate.action === "unchanged").length,
  };

  return {
    ...counts,
    message: `${counts.create} novo(s), ${counts.update} para atualizar, ${counts.unchanged} sem mudança`,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const startedAt = Date.now();

  try {
    const [upstreamEvents, pageEvents, existingEvents] = await Promise.all([
      fetchUpcomingUFCEvents(),
      fetchUpcomingUFCEventsFromPage().catch(() => []),
      loadExistingEvents(auth.adminSupabase),
    ]);

    const candidates = buildSyncPlan(
      mergeUpstreamEventSources(upstreamEvents, pageEvents),
      existingEvents,
    );
    const summary = summarizePlan(candidates);

    await logAdminAction(auth.adminSupabase, {
      userId: auth.userId,
      action: "admin_preview_events",
      details: {
        status: "info",
        trigger: auth.isExternal ? "cron" : "admin",
        candidate_count: candidates.length,
        created_count: summary.create,
        updated_count: summary.update,
        unchanged_count: summary.unchanged,
        duration_ms: Date.now() - startedAt,
        message: summary.message,
      },
    });

    return NextResponse.json({
      ok: true,
      ...summary,
      events: candidates,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao listar eventos";
    await logAdminAction(auth.adminSupabase, {
      userId: auth.userId,
      action: "admin_preview_events",
      details: {
        status: "error",
        trigger: auth.isExternal ? "cron" : "admin",
        duration_ms: Date.now() - startedAt,
        message,
      },
    });
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  assertSameOriginForMutation(req);
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const startedAt = Date.now();

  let selectedEventIds: string[] | undefined;
  try {
    const body = await req.json();
    if (Array.isArray(body?.selectedEventIds)) {
      selectedEventIds = body.selectedEventIds.filter(
        (value: unknown): value is string => typeof value === "string" && value.length > 0,
      );
    }
  } catch {
    selectedEventIds = undefined;
  }

  try {
    const [upstreamEvents, pageEvents, existingEvents] = await Promise.all([
      fetchUpcomingUFCEvents(),
      fetchUpcomingUFCEventsFromPage().catch(() => []),
      loadExistingEvents(auth.adminSupabase),
    ]);

    const candidates = buildSyncPlan(
      mergeUpstreamEventSources(upstreamEvents, pageEvents),
      existingEvents,
    );
    const selectedCandidates =
      selectedEventIds === undefined
        ? candidates
        : candidates.filter((candidate) => selectedEventIds?.includes(candidate.source_id));

    if (!selectedCandidates.length) {
      return NextResponse.json(
        { error: "Nenhum evento selecionado para sincronizar" },
        { status: 400 },
      );
    }

    const created: string[] = [];
    const updated: string[] = [];
    const unchanged: string[] = [];
    const cardSynced: string[] = [];
    const cardPending: string[] = [];
    const cardErrors: string[] = [];
    let cardAddedCount = 0;
    let cardUpdatedCount = 0;

    for (const candidate of selectedCandidates) {
      const payload = {
        name: candidate.name,
        slug: candidate.slug,
        event_date: candidate.event_date,
        prelims_start_at: candidate.prelims_start_at,
        timing_mode: candidate.timing_mode,
        location: candidate.location,
        banner_image_url: candidate.banner_image_url,
        ufc_event_id: candidate.source_id,
        status: candidate.status,
        picks_lock_at: candidate.picks_lock_at,
        picks_open_at: candidate.picks_open_at,
      };
      let eventId = candidate.existing_event?.id || null;

      if (!candidate.existing_event) {
        const { data: createdEvent, error } = await auth.adminSupabase
          .from("events")
          .insert(payload)
          .select("id")
          .single();
        if (error || !createdEvent) {
          return NextResponse.json(
            { error: `Falha ao criar ${candidate.name}: ${error.message}` },
            { status: 500 },
          );
        }
        eventId = createdEvent.id;
        created.push(candidate.name);
      } else if (candidate.action === "unchanged") {
        unchanged.push(candidate.name);
      } else {
        const { error } = await auth.adminSupabase
          .from("events")
          .update(payload)
          .eq("id", candidate.existing_event.id);

        if (error) {
          return NextResponse.json(
            { error: `Falha ao atualizar ${candidate.name}: ${error.message}` },
            { status: 500 },
          );
        }
        updated.push(candidate.name);
      }

      if (!eventId) continue;

      // Tenta descobrir ufc_stats_url automaticamente
      try {
        const ufcStatsUrl = await discoverUfcStatsUrl(candidate.name, candidate.event_date);
        if (ufcStatsUrl) {
          await auth.adminSupabase.from("events").update({ ufc_stats_url: ufcStatsUrl }).eq("id", eventId);
        }
      } catch {
        // silencioso — não quebra o sync
      }

      try {
        const cardResult = await syncScrapedCardForEvent(
          auth.adminSupabase,
          eventId,
          candidate.event_url,
        );
        await syncUfcOddsForEvent(auth.adminSupabase, {
          id: eventId,
          name: candidate.name,
        });

        cardAddedCount += cardResult.added_count;
        cardUpdatedCount += cardResult.updated_count;

        if (cardResult.scraped_count === 0) {
          cardPending.push(`${candidate.name} (sem lutas na página ainda)`);
        } else {
          cardSynced.push(
            `${candidate.name} (${cardResult.scraped_count} lutas, +${cardResult.added_count}/~${cardResult.updated_count})`,
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "falha ao sincronizar card";
        cardErrors.push(`${candidate.name}: ${message}`);
      }
    }

    await logAdminAction(auth.adminSupabase, {
      userId: auth.userId,
      action: "admin_sync_events",
      details: {
        status: cardErrors.length ? "warning" : "success",
        trigger: auth.isExternal ? "cron" : "admin",
        selected_count: selectedCandidates.length,
        created_count: created.length,
        updated_count: updated.length,
        unchanged_count: unchanged.length,
        card_synced_count: cardSynced.length,
        card_pending_count: cardPending.length,
        card_error_count: cardErrors.length,
        card_added_count: cardAddedCount,
        card_updated_count: cardUpdatedCount,
        selected_source_ids: selectedCandidates.map((candidate) => candidate.source_id),
        duration_ms: Date.now() - startedAt,
        message: `${created.length} criado(s), ${updated.length} atualizado(s), ${unchanged.length} sem mudança`,
      },
    });

    revalidateTag(CACHE_TAGS.events, "max");
    revalidatePath("/admin");

    return NextResponse.json({
      ok: true,
      message: `${created.length} criado(s), ${updated.length} atualizado(s), ${unchanged.length} sem mudança · cards: +${cardAddedCount}/~${cardUpdatedCount}`,
      created,
      updated,
      unchanged,
      card_synced: cardSynced,
      card_pending: cardPending,
      card_errors: cardErrors,
      card_added_count: cardAddedCount,
      card_updated_count: cardUpdatedCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao sincronizar eventos";
    await logAdminAction(auth.adminSupabase, {
      userId: auth.userId,
      action: "admin_sync_events",
      details: {
        status: "error",
        trigger: auth.isExternal ? "cron" : "admin",
        duration_ms: Date.now() - startedAt,
        message,
      },
    });
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
