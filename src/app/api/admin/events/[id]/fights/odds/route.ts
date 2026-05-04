export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { updateAdminFightOdds } from "@/server/services/app";
import { adminFightOddsBatchSchema } from "@/server/validators/admin";

type Params = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    assertSameOriginForMutation(request);
    await requireAdmin();
    const body = await parseJsonBody(request, adminFightOddsBatchSchema);
    const data = await updateAdminFightOdds(params.id, body.updates);
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
