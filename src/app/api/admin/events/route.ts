import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { createAdminEvent } from "@/server/services/app";
import { adminEventSchema } from "@/server/validators/admin";

export async function POST(request: NextRequest) {
  try {
    assertSameOriginForMutation(request);
    await requireAdmin();
    const body = await parseJsonBody(request, adminEventSchema);
    const event = await createAdminEvent(body);
    return apiSuccess({ event });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
