import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { updateMyProfileNickname } from "@/server/services/app";
import { updateMyProfileSchema } from "@/server/validators/me";

export async function PATCH(request: NextRequest) {
  try {
    assertSameOriginForMutation(request);
    const body = await parseJsonBody(request, updateMyProfileSchema);
    const data = await updateMyProfileNickname(body.nickname);
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
