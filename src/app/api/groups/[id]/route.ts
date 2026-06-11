export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { getGroupDetail } from "@/server/services/app";

type Params = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const group = await getGroupDetail(params.id);
    if (!group) {
      return apiErrorFromUnknown(
        Object.assign(new Error("Grupo não encontrado."), { statusCode: 404 }),
      );
    }
    return apiSuccess(group);
  } catch (e) {
    return apiErrorFromUnknown(e);
  }
}
