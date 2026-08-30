export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { getAutomationHealth } from "@/server/services/automation-health";
import { getAdminOperationLogs } from "@/server/services/operation-logs";
import { getAdminSupabase } from "@/server/supabase";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const requestedLimit = Number(request.nextUrl.searchParams.get("limit") || 250);
    const [logs, automations] = await Promise.all([
      getAdminOperationLogs(requestedLimit),
      getAdminSupabase().then((client) => getAutomationHealth(client)),
    ]);
    return apiSuccess({ logs, automations, generatedAt: new Date().toISOString() });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
