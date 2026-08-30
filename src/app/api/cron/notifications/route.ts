export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { apiFailure, apiSuccess, apiErrorFromUnknown } from "@/server/api";
import { CACHE_TAGS } from "@/server/cache-tags";
import { dispatchDuePickNotifications } from "@/server/services/notifications";
import { dispatchEventLifecycle } from "@/server/services/event-lifecycle";
import { getAdminSupabase } from "@/server/supabase";
import { tryRecordAutomationHealth } from "@/server/services/automation-health";
import {
  isResultFallbackDue,
  runResultSupervisor,
} from "@/server/services/result-supervisor";

function isAuthorized(request: NextRequest) {
  const secret = process.env.NOTIFICATIONS_CRON_SECRET;
  if (!secret) return false;

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

async function syncResultsFallback(
  adminSupabase: Awaited<ReturnType<typeof getAdminSupabase>>,
  request: NextRequest,
) {
  const syncSecret = process.env.SYNC_SECRET;
  if (!syncSecret) {
    return { ok: false, error: "SYNC_SECRET ausente" };
  }

  try {
    const { data: resultHealth } = await adminSupabase
      .from("automation_health")
      .select("status, last_started_at")
      .eq("automation_key", "results")
      .maybeSingle();
    if (!isResultFallbackDue(resultHealth)) {
      return { ok: true, skipped: "primary_supervisor_healthy" };
    }

    return {
      ok: true,
      ...(await runResultSupervisor(adminSupabase, {
        origin: request.nextUrl.origin,
        syncSecret,
      })),
    };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "falha no fallback de resultados";
    await adminSupabase.from("activity_logs").insert({
      user_id: null,
      action: "admin_sync_alert",
      details: {
        type: "result_supervisor_fallback_failed",
        trigger: "cron",
        error: message,
      },
    });
    return { ok: false, error: message };
  }
}

async function dispatch(request: NextRequest) {
  if (!isAuthorized(request)) {
    return apiFailure(401, "UNAUTHORIZED", "Cron não autorizado.");
  }

  const adminSupabase = await getAdminSupabase();
  const startedAt = new Date().toISOString();
  await tryRecordAutomationHealth(adminSupabase, "notifications", "running", startedAt);
  try {
    const lifecycle = await dispatchEventLifecycle(adminSupabase);
    if (
      lifecycle.expired.length ||
      lifecycle.promoted.length ||
      lifecycle.completed.length
    ) {
      revalidateTag(CACHE_TAGS.events, "max");
      revalidatePath("/home");
      revalidatePath("/admin");
      revalidatePath("/ranking");
    }
    const notifications = await dispatchDuePickNotifications(adminSupabase);
    // Redundância: se o job de dois minutos falhar, este mantém os resultados vivos.
    const resultFallback = await syncResultsFallback(adminSupabase, request);
    await tryRecordAutomationHealth(
      adminSupabase,
      "notifications",
      resultFallback.ok ? "success" : "warning",
      startedAt,
      { details: { lifecycle, notifications, result_fallback: resultFallback } },
    );
    return apiSuccess({ lifecycle, notifications, result_fallback: resultFallback });
  } catch (error) {
    await tryRecordAutomationHealth(adminSupabase, "notifications", "error", startedAt, {
      error: error instanceof Error ? error.message : "falha no cron de notificações",
    });
    throw error;
  }
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
