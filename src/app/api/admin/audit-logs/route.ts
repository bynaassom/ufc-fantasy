import { apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { getAdminAuditLogs } from "@/server/services/app";

export async function GET() {
  try {
    await requireAdmin();
    const logs = await getAdminAuditLogs();
    return apiSuccess({ logs });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
