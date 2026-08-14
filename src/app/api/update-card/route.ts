export const dynamic = "force-dynamic";

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  diffScrapedCardAgainstExistingFights,
  ensureFighter,
  resolveEventUrlCandidates,
  scrapeUfcEventCard,
} from "@/lib/ufc-card-sync";
import { readUpdateCardRequest } from "@/lib/update-card-request";
import { assertSameOriginForMutation } from "@/server/api";
import { CACHE_TAGS } from "@/server/cache-tags";
import { notifyBulkCardChanges } from "@/server/services/notifications";

function getFighterName(
  fighter: { name?: string | null } | Array<{ name?: string | null }> | null | undefined,
) {
  if (Array.isArray(fighter)) {
    return fighter[0]?.name || "";
  }

  return fighter?.name || "";
}

async function safelyNotifyBulkCardChanges(
  client: any,
  input: Parameters<typeof notifyBulkCardChanges>[1],
) {
  try {
    await notifyBulkCardChanges(client, input);
  } catch (error) {
    console.error("Failed to create card notification", error);
  }
}

export async function POST(req: NextRequest) {
  assertSameOriginForMutation(req);
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

  const { event_id, confirm_removals, remove_ids } = await readUpdateCardRequest(req);
  if (!event_id) {
    return NextResponse.json({ error: "event_id obrigatório" }, { status: 400 });
  }

  const { data: event } = await adminSupabase
    .from("events")
    .select("id, name, slug, ufc_event_id, event_date")
    .eq("id", event_id)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  }

  const candidateUrls = await resolveEventUrlCandidates(event);
  if (!candidateUrls.length) {
    return NextResponse.json(
      { error: "Não foi possível montar a URL oficial do evento no UFC.com" },
      { status: 400 },
    );
  }

  let scrapedFights: Awaited<ReturnType<typeof scrapeUfcEventCard>> = [];
  let resolvedUrl = "";
  const attemptedErrors: string[] = [];

  for (const candidateUrl of candidateUrls) {
    try {
      const fights = await scrapeUfcEventCard(candidateUrl);
      if (fights.length === 0) {
        attemptedErrors.push(`${candidateUrl}: nenhuma luta encontrada`);
        continue;
      }

      scrapedFights = fights;
      resolvedUrl = candidateUrl;
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : "falha ao buscar card";
      attemptedErrors.push(`${candidateUrl}: ${message}`);
    }
  }

  if (!scrapedFights.length) {
    return NextResponse.json(
      {
        error: "Nenhuma luta encontrada na página do UFC.com",
        attempted_urls: candidateUrls,
        attempted_errors: attemptedErrors,
      },
      { status: 404 },
    );
  }

  const resolvedSlug = resolvedUrl.match(/\/event\/([^/?#]+)/i)?.[1];
  if (resolvedSlug && resolvedSlug !== event.slug) {
    await adminSupabase.from("events").update({ slug: resolvedSlug }).eq("id", event_id);
  }

  const { data: currentFights } = await adminSupabase
    .from("fights")
    .select(
      `id, weight_class, card_type, fight_order, is_title_fight, total_rounds, result_confirmed, ufc_matchup_url,
      fighter_a:fighters!fighter_a_id(id, name),
      fighter_b:fighters!fighter_b_id(id, name)`,
    )
    .eq("event_id", event_id);

  const diff = diffScrapedCardAgainstExistingFights(currentFights || [], scrapedFights);

  if (!confirm_removals) {
    const removedWithPicks = await Promise.all(
      diff.removed.map(async (fight) => {
        const { count } = await adminSupabase
          .from("picks")
          .select("id", { count: "exact", head: true })
          .eq("fight_id", fight.id);

        return {
          ...fight,
          picks_count: count || 0,
          fighter_a_name: getFighterName(fight.fighter_a),
          fighter_b_name: getFighterName(fight.fighter_b),
        };
      }),
    );

    return NextResponse.json({
      preview: true,
      resolved_url: resolvedUrl,
      attempted_urls: candidateUrls,
      attempted_errors: attemptedErrors,
      added: diff.added.map((fight) => ({
        fighter_a: fight.fighter_a.name,
        fighter_b: fight.fighter_b.name,
        weight_class: fight.weight_class,
        card_type: fight.card_type,
      })),
      removed: removedWithPicks.map((fight) => ({
        id: fight.id,
        fighter_a: fight.fighter_a_name,
        fighter_b: fight.fighter_b_name,
        picks_count: fight.picks_count,
      })),
      updated: diff.updated.map((fight) => ({
        fighter_a: fight.fight.fighter_a.name,
        fighter_b: fight.fight.fighter_b.name,
        changes: fight.changes,
      })),
    });
  }

  const log: string[] = [];
  let appliedChangeCount = 0;

  for (const fight of diff.added) {
    const fighterAId = await ensureFighter(adminSupabase, fight.fighter_a);
    const fighterBId = await ensureFighter(adminSupabase, fight.fighter_b);

    const { error: createFightError } = await adminSupabase
      .from("fights")
      .insert({
        event_id,
        fighter_a_id: fighterAId,
        fighter_b_id: fighterBId,
        card_type: fight.card_type,
        fight_order: fight.fight_order,
        weight_class: fight.weight_class,
        is_title_fight: fight.is_title_fight,
        total_rounds: fight.total_rounds,
        ufc_matchup_url: fight.ufc_matchup_url,
      });

    if (createFightError) throw createFightError;

    log.push(`✓ Adicionada: ${fight.fighter_a.name} vs ${fight.fighter_b.name}`);
    appliedChangeCount += 1;
  }

  for (const id of remove_ids || []) {
    const dbFight = (currentFights || []).find((fight) => fight.id === id);
    if (!dbFight) continue;

    await adminSupabase.from("picks").delete().eq("fight_id", id);
    await adminSupabase.from("fights").delete().eq("id", id);
    log.push(
      `✗ Removida: ${getFighterName(dbFight.fighter_a)} vs ${getFighterName(dbFight.fighter_b)}`,
    );
    appliedChangeCount += 1;
  }

  for (const updatedFight of diff.updated) {
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updatedFight.changes)) {
      updateData[key] = value.to;
    }

    await adminSupabase.from("fights").update(updateData).eq("id", updatedFight.db_id);
    log.push(
      `↻ Atualizada: ${updatedFight.fight.fighter_a.name} vs ${updatedFight.fight.fighter_b.name}`,
    );
    appliedChangeCount += 1;
  }

  await safelyNotifyBulkCardChanges(adminSupabase, {
    event,
    changeCount: appliedChangeCount,
    batchId: randomUUID(),
  });

  revalidateTag(CACHE_TAGS.events, "max");

  return NextResponse.json({
    ok: true,
    resolved_url: resolvedUrl,
    attempted_urls: candidateUrls,
    attempted_errors: attemptedErrors,
    log,
  });
}
