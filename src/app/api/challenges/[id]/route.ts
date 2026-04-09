import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { respondToChallenge } from "@/server/services/app";
import { challengeActionSchema } from "@/server/validators/challenges";

type Params = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    assertSameOriginForMutation(request);
    const body = await parseJsonBody(request, challengeActionSchema);
    const data = await respondToChallenge(params.id, body.action);
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
