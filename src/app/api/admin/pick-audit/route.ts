export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { getAdminPickAudit } from "@/server/services/app";
import { postgresUuidSchema } from "@/server/validators/ids";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const userId = postgresUuidSchema.parse(
      request.nextUrl.searchParams.get("userId"),
    );
    const eventId = postgresUuidSchema.parse(
      request.nextUrl.searchParams.get("eventId"),
    );
    const audit = await getAdminPickAudit(userId, eventId);
    return apiSuccess(audit);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
