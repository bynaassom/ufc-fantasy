export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { requireActiveUser } from "@/server/auth/guards";
import { getFeedForUser } from "@/server/services/activity";

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireActiveUser();
    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before");
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10));
    const data = await getFeedForUser(user.id, before, limit);
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
