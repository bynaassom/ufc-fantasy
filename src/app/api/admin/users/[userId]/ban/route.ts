export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { toggleAdminUserBan } from "@/server/services/app";
import { adminBanToggleSchema } from "@/server/validators/admin";

type Params = {
  params: { userId: string };
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    assertSameOriginForMutation(request);
    await requireAdmin();
    const body = await parseJsonBody(request, adminBanToggleSchema);
    const data = await toggleAdminUserBan(params.userId, body.currentBan);
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
