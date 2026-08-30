export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiErrorFromUnknown, apiFailure, apiSuccess } from "@/server/api";
import { tryRecordAutomationHealth } from "@/server/services/automation-health";
import { runResultSupervisor } from "@/server/services/result-supervisor";
import { getAdminSupabase } from "@/server/supabase";

function isAuthorized(request: NextRequest) {
  const secret = process.env.SYNC_SECRET;
  return !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
}

async function dispatch(request: NextRequest) {
  if (!isAuthorized(request)) {
    return apiFailure(401, "UNAUTHORIZED", "Cron não autorizado.");
  }

  const syncSecret = process.env.SYNC_SECRET!;
  const startedAt = new Date().toISOString();
  const adminSupabase = await getAdminSupabase();
  await tryRecordAutomationHealth(adminSupabase, "results", "running", startedAt);

  try {
    const result = await runResultSupervisor(adminSupabase, {
      origin: request.nextUrl.origin,
      syncSecret,
    });
    const status = result.failed ? "error" : "success";
    const firstError = result.events.find((event) => event.status === "failed")?.error;
    await tryRecordAutomationHealth(adminSupabase, "results", status, startedAt, {
      error: firstError || null,
      details: result,
    });

    if (result.failed) {
      return apiFailure(
        502,
        "RESULT_SYNC_FAILED",
        `${result.failed} evento(s) falharam na sincronização de resultados.`,
        result,
      );
    }

    return apiSuccess(result);
  } catch (error) {
    await tryRecordAutomationHealth(adminSupabase, "results", "error", startedAt, {
      error: error instanceof Error ? error.message : "falha no supervisor de resultados",
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
