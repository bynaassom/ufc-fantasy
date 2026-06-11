export const dynamic = "force-dynamic";

import {
  apiErrorFromUnknown,
  apiSuccess,
} from "@/server/api";
import { completeMyOnboarding } from "@/server/services/app";

export async function POST() {
  try {
    await completeMyOnboarding();
    return apiSuccess({ success: true });
  } catch (e) {
    return apiErrorFromUnknown(e);
  }
}
