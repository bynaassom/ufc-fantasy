export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiErrorFromUnknown, apiFailure, apiSuccess } from "@/server/api";
import { dispatchDueCardVerifications } from "@/server/services/card-verification";
import { getAdminSupabase } from "@/server/supabase";

function isAuthorized(request: NextRequest) {
  const secret = process.env.SYNC_SECRET;
  return !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
}

async function dispatch(request: NextRequest) {
  if (!isAuthorized(request)) {
    return apiFailure(401, "UNAUTHORIZED", "Cron não autorizado.");
  }

  const adminSupabase = await getAdminSupabase();
  return apiSuccess(await dispatchDueCardVerifications(adminSupabase));
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
