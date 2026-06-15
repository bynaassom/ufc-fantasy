export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { getAdminAuditLogs } from "@/server/services/app";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const action = req.nextUrl.searchParams.get("action") || undefined;
    const logs = await getAdminAuditLogs(action);
    return apiSuccess({ logs });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
