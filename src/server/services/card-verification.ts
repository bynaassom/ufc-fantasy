import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import type { DbClient } from "@/types/database";
import {
  buildVerifiedCardPlan,
  getDueCardVerificationWindow,
  type VerificationFight,
} from "@/lib/card-verification";
import {
  fetchUfcStatsHtml,
  parseUfcStatsEventCard,
} from "@/lib/ufc-results-sync";
import { logAdminAction } from "@/lib/admin-audit";
import {
  ensureFighter,
  resolveEventUrlCandidates,
  scrapeUfcEventCard,
} from "@/lib/ufc-card-sync";
import {
  extractUfcLiveEventId,
  fetchUfcLiveEvent,
} from "@/lib/ufc-live-api";
import { CACHE_TAGS } from "@/server/cache-tags";
import { notifyBulkCardChanges } from "@/server/services/notifications";

type VerificationEvent = {
  id: string;
  name: string;
  slug: string;
  event_date: string;
  picks_lock_at: string;
  ufc_event_id?: string | null;
  ufc_stats_url?: string | null;
};

async function scrapeOfficialCard(event: VerificationEvent) {
  const errors: string[] = [];
  const candidates = await resolveEventUrlCandidates(event);

  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "text/html,application/xhtml+xml" },
      });
      if (!response.ok) throw new Error(`UFC.com HTTP ${response.status}`);
      const html = await response.text();
      const liveEventId = extractUfcLiveEventId(html);

      if (liveEventId) {
        const official = await fetchUfcLiveEvent(liveEventId);
        const fights = official.event.fights.map((fight) => ({
          fmid: fight.fightId,
          fighter_a: { name: fight.fighterA.name, country: "", headshot_url: "" },
          fighter_b: { name: fight.fighterB.name, country: "", headshot_url: "" },
          card_type: fight.cardType,
          fight_order: fight.fightOrder,
          weight_class: fight.weightClass,
          is_title_fight: fight.isTitleFight,
          total_rounds: fight.totalRounds,
          ufc_matchup_url: `${url}#${fight.fightId}`,
        }));
        if (fights.length) {
          return {
            url,
            apiUrl: official.url,
            apiEventId: official.event.eventId,
            fights,
            errors,
          };
        }
      }

      const fights = await scrapeUfcEventCard(url);
      if (fights.length) return { url, apiUrl: null, apiEventId: null, fights, errors };
      errors.push(`${url}: nenhuma luta encontrada`);
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : "falha desconhecida"}`);
    }
  }

  throw new Error(`UFC.com indisponível (${errors.join("; ") || "sem URL candidata"})`);
}

async function runEventVerification(
  adminSupabase: DbClient,
  event: VerificationEvent,
  window: "t72" | "t18",
) {
  const official = await scrapeOfficialCard(event);
  const ufcStats = event.ufc_stats_url
    ? await fetchUfcStatsHtml(event.ufc_stats_url)
        .then((html) => {
          const fights = parseUfcStatsEventCard(html);
          return {
            available: fights.length > 0,
            fights,
            reason: fights.length ? null : "nenhuma luta publicada",
          };
        })
        .catch((error) => ({
          available: false,
          fights: [],
          reason: error instanceof Error ? error.message : "falha desconhecida",
        }))
    : { available: false, fights: [], reason: "URL não configurada" };

  const { data: currentFights, error: currentFightsError } = await adminSupabase
    .from("fights")
    .select(
      `id, weight_class, card_type, fight_order, is_title_fight, total_rounds, result_confirmed, ufc_matchup_url,
      fighter_a:fighters!fighter_a_id(id, name),
      fighter_b:fighters!fighter_b_id(id, name)`,
    )
    .eq("event_id", event.id);
  if (currentFightsError) throw new Error(currentFightsError.message);

  const plan = buildVerifiedCardPlan({
    window,
    currentFights: (currentFights || []) as VerificationFight[],
    ufcFights: official.fights,
    ufcStatsFights: ufcStats.fights,
    ufcStatsAvailable: ufcStats.available,
  });

  for (const fight of plan.added) {
    const fighterAId = await ensureFighter(adminSupabase, fight.fighter_a);
    const fighterBId = await ensureFighter(adminSupabase, fight.fighter_b);
    const { error } = await adminSupabase.from("fights").insert({
      event_id: event.id,
      fighter_a_id: fighterAId,
      fighter_b_id: fighterBId,
      card_type: fight.card_type,
      fight_order: fight.fight_order,
      weight_class: fight.weight_class,
      is_title_fight: fight.is_title_fight,
      total_rounds: fight.total_rounds,
      ufc_matchup_url: fight.ufc_matchup_url,
    });
    if (error) throw new Error(error.message);
  }

  for (const fight of plan.removed) {
    const { error: picksError } = await adminSupabase
      .from("picks")
      .delete()
      .eq("fight_id", fight.fight_id);
    if (picksError) throw new Error(picksError.message);
    const { error } = await adminSupabase.from("fights").delete().eq("id", fight.fight_id);
    if (error) throw new Error(error.message);
  }

  for (const fight of plan.updated) {
    const update = Object.fromEntries(
      Object.entries(fight.changes).map(([key, change]) => [key, change.to]),
    );
    const { error } = await adminSupabase.from("fights").update(update).eq("id", fight.fight_id);
    if (error) throw new Error(error.message);
  }

  const changeCount = plan.added.length + plan.updated.length + plan.removed.length;
  if (changeCount) {
    try {
      await notifyBulkCardChanges(adminSupabase, {
        event,
        changeCount,
        batchId: randomUUID(),
      });
    } catch (error) {
      plan.alerts.push(
        `Notificação não enviada: ${error instanceof Error ? error.message : "falha desconhecida"}`,
      );
    }
    revalidateTag(CACHE_TAGS.events, "max");
  }

  return {
    event_id: event.id,
    event_name: event.name,
    window,
    sources: {
      ufc: {
        available: true,
        url: official.url,
        api_url: official.apiUrl,
        api_event_id: official.apiEventId,
        fight_count: official.fights.length,
      },
      ufc_stats: {
        available: ufcStats.available,
        url: event.ufc_stats_url || null,
        fight_count: ufcStats.fights.length,
        reason: ufcStats.reason,
      },
    },
    changes: {
      added: plan.added.map((fight) => `${fight.fighter_a.name} vs ${fight.fighter_b.name}`),
      updated: plan.updated.map((fight) => fight.fight_name),
      removed: plan.removed.map((fight) => fight.fight_name),
    },
    alerts: plan.alerts,
  };
}

export async function dispatchDueCardVerifications(adminSupabase: DbClient, now = new Date()) {
  const horizon = new Date(now.getTime() + 73 * 60 * 60 * 1000).toISOString();
  const { data: events, error: eventsError } = await adminSupabase
    .from("events")
    .select("id, name, slug, event_date, picks_lock_at, ufc_event_id, ufc_stats_url")
    .in("status", ["upcoming", "live"])
    .not("picks_lock_at", "is", null)
    .gt("picks_lock_at", now.toISOString())
    .lte("picks_lock_at", horizon)
    .order("picks_lock_at", { ascending: true });
  if (eventsError) throw new Error(eventsError.message);

  const results: Array<Record<string, unknown>> = [];
  for (const event of (events || []) as VerificationEvent[]) {
    const { data: completedRuns, error: completedRunsError } = await adminSupabase
      .from("card_verification_runs")
      .select("scheduled_for")
      .eq("event_id", event.id)
      .eq("status", "completed");
    if (completedRunsError) throw new Error(completedRunsError.message);

    const due = getDueCardVerificationWindow({
      picksLockAt: event.picks_lock_at,
      now,
      completedScheduledFors: (completedRuns || []).map((run: any) => run.scheduled_for),
    });
    if (!due) continue;

    const { data: existingRun } = await adminSupabase
      .from("card_verification_runs")
      .select("id, status")
      .eq("event_id", event.id)
      .eq("scheduled_for", due.scheduledFor)
      .maybeSingle();
    if (existingRun?.status === "running") continue;

    let runId = existingRun?.id;
    if (runId) {
      const { error } = await adminSupabase
        .from("card_verification_runs")
        .update({ status: "running", started_at: now.toISOString(), error_message: null })
        .eq("id", runId);
      if (error) throw new Error(error.message);
    } else {
      const { data: createdRun, error } = await adminSupabase
        .from("card_verification_runs")
        .insert({
          event_id: event.id,
          verification_window: due.window,
          scheduled_for: due.scheduledFor,
          status: "running",
          started_at: now.toISOString(),
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      runId = createdRun.id;
    }

    try {
      const summary = await runEventVerification(adminSupabase, event, due.window);
      await adminSupabase
        .from("card_verification_runs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          summary,
        })
        .eq("id", runId);
      await logAdminAction(adminSupabase, {
        action: "automatic_card_verification",
        details: summary,
      });
      results.push(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "falha desconhecida";
      await adminSupabase
        .from("card_verification_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: message,
        })
        .eq("id", runId);
      results.push({ event_id: event.id, event_name: event.name, window: due.window, error: message });
    }
  }

  return { checked_at: now.toISOString(), results };
}
