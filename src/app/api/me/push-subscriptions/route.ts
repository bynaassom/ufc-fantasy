import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { requireActiveUser } from "@/server/auth/guards";
import { getAdminSupabase } from "@/server/supabase";
import {
  deletePushSubscriptionForUser,
  upsertPushSubscription,
} from "@/server/repositories/push-subscriptions";
import {
  deletePushSubscriptionSchema,
  pushSubscriptionSchema,
} from "@/server/validators/notifications";

export async function POST(request: NextRequest) {
  try {
    assertSameOriginForMutation(request);
    const { user } = await requireActiveUser();
    const body = await parseJsonBody(request, pushSubscriptionSchema);
    const adminSupabase = await getAdminSupabase();

    await upsertPushSubscription(adminSupabase, {
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      user_agent: request.headers.get("user-agent"),
    });

    return apiSuccess({ subscribed: true });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    assertSameOriginForMutation(request);
    const { user } = await requireActiveUser();
    const body = await parseJsonBody(request, deletePushSubscriptionSchema);
    const adminSupabase = await getAdminSupabase();

    await deletePushSubscriptionForUser(adminSupabase, user.id, body.endpoint);

    return apiSuccess({ subscribed: false });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
