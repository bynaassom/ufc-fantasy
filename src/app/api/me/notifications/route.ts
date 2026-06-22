export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiErrorFromUnknown, apiSuccess, assertSameOriginForMutation } from "@/server/api";
import { clearMyNotifications, getMyNotifications } from "@/server/services/app";

export async function GET() {
  try {
    const data = await getMyNotifications();
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOriginForMutation(request);
    await clearMyNotifications();
    return apiSuccess({ cleared: true });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
