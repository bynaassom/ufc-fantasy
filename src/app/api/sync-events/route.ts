import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { fetchUpcomingUFCEvents } from "@/lib/ufc-api";

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

export async function POST(_req: NextRequest) {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role, is_banned")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || profile.is_banned) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const upstreamEvents = await fetchUpcomingUFCEvents();
  if (!upstreamEvents.length) {
    return NextResponse.json({
      ok: true,
      message: "Nenhum evento futuro encontrado na fonte do UFC",
      created: [],
      updated: [],
      unchanged: [],
    });
  }

  const { data: existingEvents, error: existingError } = await adminSupabase
    .from("events")
    .select(
      "id, name, slug, ufc_event_id, event_date, location, banner_image_url, picks_lock_at, picks_open_at",
    )
    .order("event_date", { ascending: true });

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 },
    );
  }

  const byUfcId = new Map<string, ExistingEvent>();
  const bySlug = new Map<string, ExistingEvent>();

  for (const event of (existingEvents || []) as ExistingEvent[]) {
    if (event.ufc_event_id) byUfcId.set(event.ufc_event_id, event);
    bySlug.set(event.slug, event);
  }

  const created: string[] = [];
  const updated: string[] = [];
  const unchanged: string[] = [];

  for (const upstreamEvent of upstreamEvents) {
    const eventDate = toIsoOrNull(upstreamEvent.date);
    if (!eventDate) continue;

    const slug = slugify(upstreamEvent.name);
    const picksLockAt = subtractMinutes(eventDate, 30);
    const picksOpenAt = subtractHours(eventDate, 12);

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

    const existing =
      byUfcId.get(upstreamEvent.id) ||
      bySlug.get(slug);

    if (!existing) {
      const { error } = await adminSupabase.from("events").insert(payload);
      if (error) {
        return NextResponse.json(
          { error: `Falha ao criar ${upstreamEvent.name}: ${error.message}` },
          { status: 500 },
        );
      }
      created.push(upstreamEvent.name);
      continue;
    }

    const changed =
      existing.name !== payload.name ||
      existing.slug !== payload.slug ||
      existing.event_date !== payload.event_date ||
      (existing.location || "") !== payload.location ||
      (existing.banner_image_url || null) !== payload.banner_image_url ||
      (existing.ufc_event_id || null) !== payload.ufc_event_id ||
      (existing.picks_lock_at || null) !== payload.picks_lock_at ||
      (existing.picks_open_at || null) !== payload.picks_open_at;

    if (!changed) {
      unchanged.push(upstreamEvent.name);
      continue;
    }

    const { error } = await adminSupabase
      .from("events")
      .update(payload)
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json(
        { error: `Falha ao atualizar ${upstreamEvent.name}: ${error.message}` },
        { status: 500 },
      );
    }
    updated.push(upstreamEvent.name);
  }

  return NextResponse.json({
    ok: true,
    message: `${created.length} criado(s), ${updated.length} atualizado(s), ${unchanged.length} sem mudança`,
    created,
    updated,
    unchanged,
  });
}
