export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { syncScrapedCardForEvent } from "@/lib/ufc-card-sync";
import { discoverUfcStatsUrl } from "@/lib/ufc-stats-discovery";
import { fetchUpcomingUFCEvents, fetchUpcomingUFCEventsFromPage } from "@/lib/ufc-api";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const syncSecret = process.env.SYNC_SECRET;
  const isAuthorized = syncSecret && authHeader === `Bearer ${syncSecret}`;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSupabase = await createAdminClient();

  try {
    const [upstreamEvents, pageEvents] = await Promise.all([
      fetchUpcomingUFCEvents(),
      fetchUpcomingUFCEventsFromPage().catch(() => []),
    ]);

    const pageByDateMatchup = new Map<string, any>();
    for (const event of pageEvents) {
      const dateKey = (event.date || "").slice(0, 10);
      const name = (event.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      pageByDateMatchup.set(`${dateKey}:${name}`, event);
    }

    const merged = upstreamEvents.map((event) => {
      const dateKey = (event.date || "").slice(0, 10);
      const nameKey = (event.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const match = pageByDateMatchup.get(`${dateKey}:${nameKey}`);
      return {
        ...event,
        name: match?.name || event.name,
        location: event.location || match?.location || "",
        image: event.image || match?.image,
        eventUrl: event.eventUrl || match?.eventUrl || "",
      };
    });

    let created = 0;
    let updated = 0;
    let cardSynced = 0;

    for (const event of merged) {
      let existing: any = null;
      try {
        const result = await adminSupabase
          .from("events")
          .select("id, name, slug, ufc_event_id, ufc_stats_url")
          .eq("ufc_event_id", event.id)
          .single();
        existing = result.data;
      } catch { /* not found */ }

      if (existing) {
        if (existing.name !== event.name) {
          await adminSupabase.from("events").update({ name: event.name }).eq("id", existing.id);
          updated++;
        }
        continue;
      }

      const slug = (event.eventUrl || event.name)
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      const picksLockAt = new Date(new Date(event.date).getTime() - 30 * 60 * 1000).toISOString();
      const picksOpenAt = new Date(new Date(event.date).getTime() - 12 * 60 * 60 * 1000).toISOString();

      let createdEvent: any = null;
      try {
        const result = await adminSupabase
          .from("events")
          .insert({
            name: event.name,
            slug,
            event_date: event.date,
            location: event.location || "",
            banner_image_url: event.image || null,
            ufc_event_id: event.id,
            status: "upcoming",
            picks_lock_at: picksLockAt,
            picks_open_at: picksOpenAt,
          })
          .select("id")
          .single();
        createdEvent = result.data;
      } catch { /* silent */ }

      if (!createdEvent) continue;
      created++;

      try {
        const ufcStatsUrl = await discoverUfcStatsUrl(event.name, event.date);
        if (ufcStatsUrl) {
          await adminSupabase.from("events").update({ ufc_stats_url: ufcStatsUrl }).eq("id", createdEvent.id);
        }
      } catch { /* silent */ }

      try {
        const url = event.eventUrl || `https://www.ufc.com.br/event/${slug}`;
        await syncScrapedCardForEvent(adminSupabase, createdEvent.id, url);
        cardSynced++;
      } catch { /* silent */ }
    }

    return NextResponse.json({
      ok: true,
      message: `${created} criado(s), ${updated} atualizado(s), ${cardSynced} cards sincronizados`,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Erro no cron de sync-events",
    }, { status: 500 });
  }
}
