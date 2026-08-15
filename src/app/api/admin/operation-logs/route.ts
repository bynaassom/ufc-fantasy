export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { getAdminOperationLogs } from "@/server/services/operation-logs";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const requestedLimit = Number(request.nextUrl.searchParams.get("limit") || 250);
    const logs = await getAdminOperationLogs(requestedLimit);
    return apiSuccess({ logs, generatedAt: new Date().toISOString() });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
