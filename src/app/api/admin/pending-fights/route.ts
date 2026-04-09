import { apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { getAdminPendingFights } from "@/server/services/app";

export async function GET() {
  try {
    await requireAdmin();
    const data = await getAdminPendingFights();
    return apiSuccess({ fights: data });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
