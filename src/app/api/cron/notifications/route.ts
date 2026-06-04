export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { apiFailure, apiSuccess, apiErrorFromUnknown } from "@/server/api";
import { CACHE_TAGS } from "@/server/cache-tags";
import { dispatchDuePickNotifications } from "@/server/services/notifications";
import { dispatchEventLifecycle } from "@/server/services/event-lifecycle";
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
  const lifecycle = await dispatchEventLifecycle(adminSupabase);
  if (lifecycle.promoted.length || lifecycle.completed.length) {
    revalidateTag(CACHE_TAGS.events);
    revalidatePath("/home");
    revalidatePath("/admin");
    revalidatePath("/ranking");
  }
  const notifications = await dispatchDuePickNotifications(adminSupabase);
  return apiSuccess({ lifecycle, notifications });
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
