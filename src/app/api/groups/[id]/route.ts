export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { ApiRouteError, apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { getGroupDetail } from "@/server/services/app";

type Params = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const group = await getGroupDetail(params.id);
    if (!group) {
      return apiErrorFromUnknown(
        new ApiRouteError(404, "NOT_FOUND", "Grupo não encontrado."),
      );
    }
    return apiSuccess(group);
  } catch (e) {
    return apiErrorFromUnknown(e);
  }
}
