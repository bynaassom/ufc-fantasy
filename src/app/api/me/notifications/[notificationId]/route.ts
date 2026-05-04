export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
} from "@/server/api";
import { markMyNotificationRead } from "@/server/services/app";

type Params = {
  params: { notificationId: string };
};

export async function PATCH(_request: NextRequest, { params }: Params) {
  try {
    assertSameOriginForMutation(_request);
    const data = await markMyNotificationRead(params.notificationId);
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
