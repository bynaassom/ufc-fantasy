import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { toggleAdminUserRole } from "@/server/services/app";
import { adminRoleToggleSchema } from "@/server/validators/admin";

type Params = {
  params: { userId: string };
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    assertSameOriginForMutation(request);
    await requireAdmin();
    const body = await parseJsonBody(request, adminRoleToggleSchema);
    const data = await toggleAdminUserRole(params.userId, body.currentRole);
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
