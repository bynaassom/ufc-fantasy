export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { saveMyEventPicks } from "@/server/services/app";
import { saveEventPicksSchema } from "@/server/validators/picks";

type Params = {
  params: { slug: string };
};

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    assertSameOriginForMutation(request);
    const body = await parseJsonBody(request, saveEventPicksSchema);
    const data = await saveMyEventPicks(params.slug, body.picks);
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
