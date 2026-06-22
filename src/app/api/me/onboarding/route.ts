export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
} from "@/server/api";
import { completeMyOnboarding } from "@/server/services/app";

export async function POST(request: NextRequest) {
  try {
    assertSameOriginForMutation(request);
    await completeMyOnboarding();
    return apiSuccess({ success: true });
  } catch (e) {
    return apiErrorFromUnknown(e);
  }
}
