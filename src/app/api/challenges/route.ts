export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { createUserChallenge } from "@/server/services/app";
import { createChallengeSchema } from "@/server/validators/challenges";

export async function POST(request: NextRequest) {
  try {
    assertSameOriginForMutation(request);
    const body = await parseJsonBody(request, createChallengeSchema);
    const data = await createUserChallenge(body.challengedId, body.eventId);
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
