import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { UFCEvent, fetchUpcomingUFCEvents } from "@/lib/ufc-api";
import { logAdminAction } from "@/lib/admin-audit";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toIsoOrNull(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function subtractMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() - minutes * 60 * 1000).toISOString();
}

function subtractHours(iso: string, hours: number) {
  return new Date(new Date(iso).getTime() - hours * 60 * 60 * 1000).toISOString();
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
  location?: string | null;
  banner_image_url?: string | null;
  picks_lock_at?: string | null;
  picks_open_at?: string | null;
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
  event_date: string;
  location: string;
  banner_image_url: string | null;
  picks_lock_at: string;
  picks_open_at: string;
  action: SyncAction;
  matched_by: MatchStrategy;
  existing_event: Pick<
    ExistingEvent,
    "id" | "name" | "slug" | "event_date" | "ufc_event_id"
  > | null;
};

async function requireAdmin() {
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

  return { adminSupabase, userId: user.id };
}

async function loadExistingEvents(adminSupabase: Awaited<ReturnType<typeof createAdminClient>>) {
  const { data, error } = await adminSupabase
    .from("events")
    .select(
      "id, name, slug, ufc_event_id, event_date, location, banner_image_url, picks_lock_at, picks_open_at",
    )
    .order("event_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as ExistingEvent[];
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

    const slug = slugify(upstreamEvent.name);
    const picksLockAt = subtractMinutes(eventDate, 30);
    const picksOpenAt = subtractHours(eventDate, 12);
    const dateKey = getDateKey(eventDate);
    const matchupKey = getMatchupKey(upstreamEvent.name);

    let matchedBy: MatchStrategy = null;
    let existing =
      byUfcId.get(upstreamEvent.id) ||
      bySlug.get(slug) ||
      null;

    if (existing === byUfcId.get(upstreamEvent.id) && existing) {
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

    const payload = {
      name: upstreamEvent.name,
      slug,
      event_date: eventDate,
      location: upstreamEvent.location || "",
      banner_image_url: upstreamEvent.image || null,
      ufc_event_id: upstreamEvent.id,
      status: "upcoming" as const,
      picks_lock_at: picksLockAt,
      picks_open_at: picksOpenAt,
    };

    const changed =
      !existing ||
      existing.name !== payload.name ||
      existing.slug !== payload.slug ||
      existing.event_date !== payload.event_date ||
      (existing.location || "") !== payload.location ||
      (existing.banner_image_url || null) !== payload.banner_image_url ||
      (existing.ufc_event_id || null) !== payload.ufc_event_id ||
      (existing.picks_lock_at || null) !== payload.picks_lock_at ||
      (existing.picks_open_at || null) !== payload.picks_open_at;

    candidates.push({
      source_id: upstreamEvent.id,
      name: payload.name,
      slug: payload.slug,
      event_date: payload.event_date,
      location: payload.location,
      banner_image_url: payload.banner_image_url,
      picks_lock_at: payload.picks_lock_at,
      picks_open_at: payload.picks_open_at,
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

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const [upstreamEvents, existingEvents] = await Promise.all([
      fetchUpcomingUFCEvents(),
      loadExistingEvents(auth.adminSupabase),
    ]);

    const candidates = buildSyncPlan(upstreamEvents, existingEvents);
    const summary = summarizePlan(candidates);

    return NextResponse.json({
      ok: true,
      ...summary,
      events: candidates,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar eventos" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

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
    const [upstreamEvents, existingEvents] = await Promise.all([
      fetchUpcomingUFCEvents(),
      loadExistingEvents(auth.adminSupabase),
    ]);

    const candidates = buildSyncPlan(upstreamEvents, existingEvents);
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

    for (const candidate of selectedCandidates) {
      const payload = {
        name: candidate.name,
        slug: candidate.slug,
        event_date: candidate.event_date,
        location: candidate.location,
        banner_image_url: candidate.banner_image_url,
        ufc_event_id: candidate.source_id,
        status: "upcoming" as const,
        picks_lock_at: candidate.picks_lock_at,
        picks_open_at: candidate.picks_open_at,
      };

      if (!candidate.existing_event) {
        const { error } = await auth.adminSupabase.from("events").insert(payload);
        if (error) {
          return NextResponse.json(
            { error: `Falha ao criar ${candidate.name}: ${error.message}` },
            { status: 500 },
          );
        }
        created.push(candidate.name);
        continue;
      }

      if (candidate.action === "unchanged") {
        unchanged.push(candidate.name);
        continue;
      }

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

    await logAdminAction(auth.adminSupabase, {
      userId: auth.userId,
      action: "admin_sync_events",
      details: {
        selected_count: selectedCandidates.length,
        created_count: created.length,
        updated_count: updated.length,
        unchanged_count: unchanged.length,
        selected_source_ids: selectedCandidates.map((candidate) => candidate.source_id),
      },
    });

    return NextResponse.json({
      ok: true,
      message: `${created.length} criado(s), ${updated.length} atualizado(s), ${unchanged.length} sem mudança`,
      created,
      updated,
      unchanged,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao sincronizar eventos" },
      { status: 500 },
    );
  }
}
