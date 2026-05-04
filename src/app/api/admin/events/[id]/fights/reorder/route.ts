export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { reorderAdminEventFights } from "@/server/services/app";
import { adminFightReorderSchema } from "@/server/validators/admin";

type Params = {
  params: { id: string };
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    assertSameOriginForMutation(request);
    await requireAdmin();
    const body = await parseJsonBody(request, adminFightReorderSchema);
    const data = await reorderAdminEventFights(params.id, body.fightIds);
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
