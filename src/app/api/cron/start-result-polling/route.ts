export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiErrorFromUnknown, apiFailure, apiSuccess } from "@/server/api";
import { activateResultPolling } from "@/server/services/cron-job-org";
import { getAdminSupabase } from "@/server/supabase";

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.SYNC_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
      return apiFailure(401, "UNAUTHORIZED", "Cron não autorizado.");
    }

    const eventId = request.nextUrl.searchParams.get("event_id")?.trim();
    if (!eventId) return apiFailure(400, "EVENT_REQUIRED", "event_id obrigatório.");

    const client = await getAdminSupabase();
    const { data: event, error } = await client
      .from("events")
      .select("id, event_date, prelims_start_at, status")
      .eq("id", eventId)
      .in("status", ["upcoming", "live"])
      .maybeSingle();
    if (error) throw error;
    if (!event) return apiFailure(404, "EVENT_NOT_FOUND", "Evento ativo não encontrado.");

    return apiSuccess(await activateResultPolling(event));
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
