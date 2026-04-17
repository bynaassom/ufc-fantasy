import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { updateMyProfile } from "@/server/services/app";
import { updateMyProfileSchema } from "@/server/validators/me";

export async function PATCH(request: NextRequest) {
  try {
    assertSameOriginForMutation(request);
    const body = await parseJsonBody(request, updateMyProfileSchema);
    const data = await updateMyProfile(body);
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
