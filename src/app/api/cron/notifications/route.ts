export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { apiFailure, apiSuccess, apiErrorFromUnknown } from "@/server/api";
import { CACHE_TAGS } from "@/server/cache-tags";
import { dispatchDuePickNotifications } from "@/server/services/notifications";
import { dispatchEventLifecycle } from "@/server/services/event-lifecycle";
import { getAdminSupabase } from "@/server/supabase";

function isAuthorized(request: NextRequest) {
  const secret = process.env.NOTIFICATIONS_CRON_SECRET;
  if (!secret) return false;

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

async function syncResultsIfDue(adminSupabase: Awaited<ReturnType<typeof getAdminSupabase>>) {
  try {
    const { data: activeEvent } = await adminSupabase
      .from("events")
      .select("id, event_date, picks_lock_at")
      .in("status", ["upcoming", "live"])
      .or("ufc_stats_url.not.is.null,ufc_event_id.not.is.null")
      .gte("event_date", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
      .order("event_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!activeEvent) return;

    const lockAt = new Date(activeEvent.picks_lock_at).getTime();
    const endAt = new Date(activeEvent.event_date).getTime() + 6 * 60 * 60 * 1000;
    const nowMs = Date.now();

    if (nowMs < lockAt || nowMs > endAt) return;

    const syncSecret = process.env.SYNC_SECRET;
    if (!syncSecret) return;

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    await fetch(`${baseUrl}/api/sync-results`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${syncSecret}`,
      },
      body: JSON.stringify({ event_id: activeEvent.id }),
    });
  } catch {
    // Fallback silencioso — não quebra o cron principal
  }
}

async function dispatch(request: NextRequest) {
  if (!isAuthorized(request)) {
    return apiFailure(401, "UNAUTHORIZED", "Cron não autorizado.");
  }

  const adminSupabase = await getAdminSupabase();
  const lifecycle = await dispatchEventLifecycle(adminSupabase);
  if (lifecycle.promoted.length || lifecycle.completed.length) {
    revalidateTag(CACHE_TAGS.events, "max");
    revalidatePath("/home");
    revalidatePath("/admin");
    revalidatePath("/ranking");
  }
  const notifications = await dispatchDuePickNotifications(adminSupabase);
  // Fallback: tenta sync de resultados como redundância
  await syncResultsIfDue(adminSupabase);
  return apiSuccess({ lifecycle, notifications });
}

export async function GET(request: NextRequest) {
  try {
    return await dispatch(request);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    return await dispatch(request);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
