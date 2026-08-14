export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import {
  deleteAdminFightById,
  updateAdminFightById,
} from "@/server/services/app";
import { adminFightPatchSchema } from "@/server/validators/admin";

type Params = {
  params: Promise<{ fightId: string }>;
};

export async function PATCH(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    assertSameOriginForMutation(request);
    await requireAdmin();
    const body = await parseJsonBody(request, adminFightPatchSchema);
    const fight = await updateAdminFightById(params.fightId, body);
    return apiSuccess({ fight });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

export async function DELETE(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    assertSameOriginForMutation(request);
    await requireAdmin();
    await deleteAdminFightById(params.fightId);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
