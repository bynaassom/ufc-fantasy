export const dynamic = "force-dynamic";

import { apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { getMyProfile } from "@/server/services/app";

export async function GET() {
  try {
    const data = await getMyProfile();
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
