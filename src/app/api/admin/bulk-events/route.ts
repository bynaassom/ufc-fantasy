import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin-audit";
import { assertSameOriginForMutation } from "@/server/api";

type BulkAction =
  | "open_now"
  | "close_now"
  | "reset_default"
  | "set_offsets"
  | "set_status";

type EventRecord = {
  id: string;
  name: string;
  event_date: string;
  status: "upcoming" | "live" | "completed";
  picks_open_at?: string | null;
  picks_lock_at?: string | null;
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

function subtractHours(iso: string, hours: number) {
  return new Date(new Date(iso).getTime() - hours * 60 * 60 * 1000).toISOString();
}

function subtractMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() - minutes * 60 * 1000).toISOString();
}

function validateAction(input: unknown): input is BulkAction {
  return (
    input === "open_now" ||
    input === "close_now" ||
    input === "reset_default" ||
    input === "set_offsets" ||
    input === "set_status"
  );
}

export async function POST(req: NextRequest) {
  assertSameOriginForMutation(req);
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const eventIds = Array.isArray(body?.event_ids)
    ? body.event_ids.filter((value: unknown): value is string => typeof value === "string")
    : [];
  const action = body?.action;
  const dryRun = body?.dry_run === true;

  if (!eventIds.length) {
    return NextResponse.json({ error: "Nenhum evento selecionado" }, { status: 400 });
  }

  if (!validateAction(action)) {
    return NextResponse.json({ error: "Ação em lote inválida" }, { status: 400 });
  }

  const { data: events, error } = await auth.adminSupabase
    .from("events")
    .select("id, name, event_date, status, picks_open_at, picks_lock_at")
    .in("id", eventIds)
    .order("event_date", { ascending: true });

  if (error || !events?.length) {
    return NextResponse.json({ error: "Eventos não encontrados" }, { status: 404 });
  }

  const openHoursBefore =
    typeof body?.open_hours_before === "number" ? body.open_hours_before : 12;
  const lockMinutesBefore =
    typeof body?.lock_minutes_before === "number" ? body.lock_minutes_before : 30;
  const nextStatus =
    body?.status === "upcoming" || body?.status === "live" || body?.status === "completed"
      ? body.status
      : null;

  if (action === "set_status" && !nextStatus) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const changes = (events as EventRecord[]).map((event) => {
    const update: Record<string, unknown> = {};

    if (action === "open_now") {
      update.picks_open_at = nowIso;
    }

    if (action === "close_now") {
      update.picks_lock_at = nowIso;
    }

    if (action === "reset_default" || action === "set_offsets") {
      update.picks_open_at = subtractHours(event.event_date, openHoursBefore);
      update.picks_lock_at = subtractMinutes(event.event_date, lockMinutesBefore);
    }

    if (action === "set_status" && nextStatus) {
      update.status = nextStatus;
    }

    return {
      id: event.id,
      name: event.name,
      before: {
        status: event.status,
        picks_open_at: event.picks_open_at || null,
        picks_lock_at: event.picks_lock_at || null,
      },
      update,
    };
  });

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      message: `${changes.length} evento(s) seriam atualizados`,
      changes,
    });
  }

  const applied: string[] = [];
  for (const change of changes) {
    const { error: updateError } = await auth.adminSupabase
      .from("events")
      .update(change.update)
      .eq("id", change.id);

    if (!updateError) {
      applied.push(change.name);
    }
  }

  await logAdminAction(auth.adminSupabase, {
    userId: auth.userId,
    action: "admin_bulk_events",
    details: {
      action,
      selected_count: eventIds.length,
      applied_count: applied.length,
      open_hours_before: action === "set_offsets" ? openHoursBefore : null,
      lock_minutes_before: action === "set_offsets" ? lockMinutesBefore : null,
      status: action === "set_status" ? nextStatus : null,
      event_ids: eventIds,
    },
  });

  return NextResponse.json({
    ok: true,
    message: `${applied.length} evento(s) atualizados`,
    applied,
  });
}
