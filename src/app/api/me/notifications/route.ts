import { apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { getMyNotifications } from "@/server/services/app";

export async function GET() {
  try {
    const data = await getMyNotifications();
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
