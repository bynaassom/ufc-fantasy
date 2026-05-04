export const dynamic = "force-dynamic";

import { apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { getAdminFighters } from "@/server/services/app";

export async function GET() {
  try {
    await requireAdmin();
    const fighters = await getAdminFighters();
    return apiSuccess({ fighters });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
