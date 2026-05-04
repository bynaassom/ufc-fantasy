export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiFailure, apiSuccess, apiErrorFromUnknown } from "@/server/api";
import { dispatchDuePickNotifications } from "@/server/services/notifications";
import { getAdminSupabase } from "@/server/supabase";

function isAuthorized(request: NextRequest) {
  const secret = process.env.NOTIFICATIONS_CRON_SECRET;
  if (!secret) return false;

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

async function dispatch(request: NextRequest) {
  if (!isAuthorized(request)) {
    return apiFailure(401, "UNAUTHORIZED", "Cron não autorizado.");
  }

  const adminSupabase = await getAdminSupabase();
  const result = await dispatchDuePickNotifications(adminSupabase);
  return apiSuccess(result);
}

export async function GET(request: NextRequest) {
  try {
    return await dispatch(request);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    return await dispatch(request);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
