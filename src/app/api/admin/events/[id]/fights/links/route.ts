export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { updateAdminFightLinks } from "@/server/services/app";
import { adminFightLinksBatchSchema } from "@/server/validators/admin";

type Params = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    assertSameOriginForMutation(request);
    await requireAdmin();
    const body = await parseJsonBody(request, adminFightLinksBatchSchema);
    const data = await updateAdminFightLinks(params.id, body.updates);
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
