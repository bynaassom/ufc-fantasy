export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { syncScrapedCardForEvent } from "@/lib/ufc-card-sync";
import { discoverUfcStatsUrl } from "@/lib/ufc-stats-discovery";
import {
  fetchUpcomingUFCEvents,
  fetchUpcomingUFCEventsFromPage,
  resolveSyncedEventBannerUrl,
} from "@/lib/ufc-api";
import { getAutomatedEventTiming } from "@/lib/event-timing";
import { getSafeSyncedEventStatus } from "@/lib/event-lifecycle";
import { syncUfcOddsForEvent } from "@/server/services/ufc-odds";
import { shouldPollFightResults } from "@/lib/result-polling";
import {
  activateResultPolling,
  scheduleResultPollingStart,
} from "@/server/services/cron-job-org";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getEventSlug(event: { eventUrl?: string; name: string }) {
  if (event.eventUrl) {
    try {
      const fromPath = new URL(event.eventUrl).pathname.match(/\/event\/([^/?#]+)/i)?.[1];
      if (fromPath) return fromPath.toLowerCase();
    } catch {
      // Usa o nome como fallback.
    }
  }
  return slugify(event.name);
}

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
        prelimsStartAt: event.prelimsStartAt || match?.prelimsStartAt,
        status: event.status || match?.status || "upcoming",
        officialApiEventId:
          event.officialApiEventId || match?.officialApiEventId,
      };
    });

    let created = 0;
    let updated = 0;
    let cardSynced = 0;
    const cardSync: Array<Record<string, unknown>> = [];

    for (const event of merged) {
      const sourceId = event.eventUrl || event.id;
      let existing: any = null;
      try {
        const result = await adminSupabase
          .from("events")
          .select("id, name, slug, status, ufc_event_id, ufc_stats_url, timing_mode, picks_open_at, banner_image_url")
          .in("ufc_event_id", Array.from(new Set([sourceId, event.id])))
          .limit(1)
          .maybeSingle();
        existing = result.data;
      } catch { /* not found */ }

      if (existing) {
        const automaticTiming = getAutomatedEventTiming({
          event_date: event.date,
          prelims_start_at: event.prelimsStartAt,
        });
        const update: Record<string, unknown> = {
          name: event.name,
          status: getSafeSyncedEventStatus(event.status, existing.status),
          banner_image_url: resolveSyncedEventBannerUrl(
            existing.banner_image_url,
            event.image,
          ),
        };
        if (existing.timing_mode !== "manual" && automaticTiming) {
          update.event_date = event.date;
          update.prelims_start_at = event.prelimsStartAt || null;
          update.picks_lock_at = automaticTiming.picksLockAt;
          update.picks_open_at = existing.picks_open_at || automaticTiming.picksOpenAt;
          update.timing_mode = "automatic";
        }
        if (existing.name !== event.name || Object.keys(update).length > 1) {
          await adminSupabase.from("events").update(update).eq("id", existing.id);
          updated++;
        }

        try {
          const slug = existing.slug || getEventSlug(event);
          const url =
            event.eventUrl ||
            (/\/event\//i.test(existing.ufc_event_id || "")
              ? existing.ufc_event_id
              : `https://www.ufc.com.br/event/${slug}`);
          const result = await syncScrapedCardForEvent(adminSupabase, existing.id, url);
          cardSync.push({ event_id: existing.id, event_name: event.name, ok: true, ...result });
          cardSynced++;
        } catch (error) {
          cardSync.push({
            event_id: existing.id,
            event_name: event.name,
            ok: false,
            error: error instanceof Error ? error.message : "card_sync_error",
          });
        }

        try {
          await syncUfcOddsForEvent(adminSupabase, {
            id: existing.id,
            name: event.name,
          });
        } catch {
          // Odds ainda podem não estar publicadas; não interrompe o sync do evento.
        }
        continue;
      }

      const slug = getEventSlug(event);
      const timing = getAutomatedEventTiming({
        event_date: event.date,
        prelims_start_at: event.prelimsStartAt,
      });
      if (!timing) continue;

      let createdEvent: any = null;
      try {
        const result = await adminSupabase
          .from("events")
          .insert({
            name: event.name,
            slug,
            event_date: event.date,
            prelims_start_at: event.prelimsStartAt || null,
            timing_mode: "automatic",
            location: event.location || "",
            banner_image_url: event.image || null,
            ufc_event_id: sourceId,
            status: getSafeSyncedEventStatus(event.status),
            picks_lock_at: timing.picksLockAt,
            picks_open_at: timing.picksOpenAt,
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
        const result = await syncScrapedCardForEvent(adminSupabase, createdEvent.id, url);
        cardSync.push({ event_id: createdEvent.id, event_name: event.name, ok: true, ...result });
        cardSynced++;
      } catch (error) {
        cardSync.push({
          event_id: createdEvent.id,
          event_name: event.name,
          ok: false,
          error: error instanceof Error ? error.message : "card_sync_error",
        });
      }

      try {
        await syncUfcOddsForEvent(adminSupabase, {
          id: createdEvent.id,
          name: event.name,
        });
      } catch {
        // Odds ainda podem não estar publicadas; não interrompe o sync do card.
      }
    }

    let resultCron: unknown = { configured: false, reason: "no_upcoming_event" };
    try {
      const { data: nextEvent } = await adminSupabase
        .from("events")
        .select("id, status, event_date, prelims_start_at")
        .in("status", ["upcoming", "live"])
        .order("event_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (nextEvent) {
        resultCron = shouldPollFightResults(nextEvent)
          ? await activateResultPolling(nextEvent)
          : await scheduleResultPollingStart(nextEvent);
      }
    } catch (error) {
      resultCron = {
        configured: false,
        reason: error instanceof Error ? error.message : "cron_job_org_error",
      };
    }

    return NextResponse.json({
      ok: true,
      message: `${created} criado(s), ${updated} atualizado(s), ${cardSynced} cards sincronizados`,
      card_sync: cardSync,
      result_cron: resultCron,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Erro no cron de sync-events",
    }, { status: 500 });
  }
}
