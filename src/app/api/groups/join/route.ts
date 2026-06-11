export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { joinGroupByCode } from "@/server/services/app";

const joinSchema = z.object({
  code: z.string().length(8),
});

export async function POST(request: NextRequest) {
  try {
    assertSameOriginForMutation(request);
    const body = await parseJsonBody(request, joinSchema);
    const group = await joinGroupByCode(body.code);
    return apiSuccess(group);
  } catch (e) {
    return apiErrorFromUnknown(e);
  }
}
