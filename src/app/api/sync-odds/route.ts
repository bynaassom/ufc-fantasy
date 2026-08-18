export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin-audit";
import { assertSameOriginForMutation } from "@/server/api";
import { syncUfcOddsForEvent } from "@/server/services/ufc-odds";

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

async function parseBody(req: NextRequest) {
  try {
    const body = await req.json();
    return {
      dryRun: body?.dry_run === true,
      eventId: typeof body?.event_id === "string" ? body.event_id : undefined,
    };
  } catch {
    return { dryRun: false, eventId: undefined };
  }
}

export async function POST(req: NextRequest) {
  assertSameOriginForMutation(req);
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const startedAt = Date.now();
  const { dryRun, eventId } = await parseBody(req);

  try {
    const eventsQuery = auth.adminSupabase
      .from("events")
      .select("id, name")
      .in("status", ["upcoming", "live"])
      .order("event_date");
    const { data: events, error: eventsError } = eventId
      ? await eventsQuery.eq("id", eventId)
      : await eventsQuery;

    if (eventsError) throw new Error(eventsError.message);
    if (!events?.length) {
      throw new Error("Nenhum evento upcoming/live encontrado");
    }

    const matches = [];
    const skipped = [];
    let changedCount = 0;
    let savedCount = 0;

    for (const event of events) {
      const result = await syncUfcOddsForEvent(auth.adminSupabase, event, {
        dryRun,
      });
      matches.push(...result.matches);
      skipped.push(...result.skipped);
      changedCount += result.changed_count;
      savedCount += result.saved_count;
    }

    const message = dryRun
      ? `${changedCount} luta(s) com mudança de odds, ${skipped.length} sem odds oficiais`
      : `${savedCount} luta(s) atualizadas, ${skipped.length} sem odds oficiais`;

    await logAdminAction(auth.adminSupabase, {
      userId: auth.userId,
      action: "admin_sync_odds",
      details: {
        status: dryRun ? "info" : "success",
        source: "UFC.com",
        dry_run: dryRun,
        event_id: eventId || null,
        changed_count: changedCount,
        saved_count: savedCount,
        skipped_count: skipped.length,
        duration_ms: Date.now() - startedAt,
      },
    });

    return NextResponse.json({
      ok: true,
      dry_run: dryRun,
      source: "UFC.com",
      message,
      matches,
      skipped,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao sincronizar odds";
    await logAdminAction(auth.adminSupabase, {
      userId: auth.userId,
      action: "admin_sync_odds",
      details: {
        status: "error",
        source: "UFC.com",
        event_id: eventId || null,
        duration_ms: Date.now() - startedAt,
        message,
      },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
