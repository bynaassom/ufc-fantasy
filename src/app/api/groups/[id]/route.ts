export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { ApiRouteError, apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { getGroupDetail } from "@/server/services/app";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const group = await getGroupDetail(params.id);
    if (!group) {
      throw new ApiRouteError(404, "GROUP_NOT_FOUND", "Grupo não encontrado.");
    }
    return apiSuccess(group);
  } catch (e) {
    return apiErrorFromUnknown(e);
  }
}
