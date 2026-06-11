export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { leaveGroup } from "@/server/services/app";

const leaveSchema = z.object({
  groupId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    assertSameOriginForMutation(request);
    const body = await parseJsonBody(request, leaveSchema);
    await leaveGroup(body.groupId);
    return apiSuccess({ success: true });
  } catch (e) {
    return apiErrorFromUnknown(e);
  }
}
