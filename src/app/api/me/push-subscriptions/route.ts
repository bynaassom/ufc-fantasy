export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { getAdminSupabase } from "@/server/supabase";
import {
  deleteAnonymousPushSubscription,
  deleteAnonymousPushSubscriptionByEndpoint,
  deletePushSubscriptionByEndpoint,
  deletePushSubscriptionForUser,
  upsertAnonymousPushSubscription,
  upsertPushSubscription,
} from "@/server/repositories/push-subscriptions";
import {
  deletePushSubscriptionSchema,
  pushSubscriptionSchema,
} from "@/server/validators/notifications";
import {
  attachCompanionCookie,
  resolveCompanionIdentity,
} from "@/server/anonymous-companion";

export async function POST(request: NextRequest) {
  try {
    assertSameOriginForMutation(request);
    const body = await parseJsonBody(request, pushSubscriptionSchema);
    const adminSupabase = await getAdminSupabase();
    const identity = await resolveCompanionIdentity(request, adminSupabase);

    if (identity.kind === "user") {
      await deleteAnonymousPushSubscriptionByEndpoint(
        adminSupabase,
        body.endpoint,
      );
      await upsertPushSubscription(adminSupabase, {
        user_id: identity.id,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        user_agent: request.headers.get("user-agent"),
      });
    } else {
      await deletePushSubscriptionByEndpoint(adminSupabase, body.endpoint);
      await upsertAnonymousPushSubscription(adminSupabase, {
        anonymous_id: identity.id,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        user_agent: request.headers.get("user-agent"),
      });
    }

    return attachCompanionCookie(apiSuccess({ subscribed: true }), identity);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    assertSameOriginForMutation(request);
    const body = await parseJsonBody(request, deletePushSubscriptionSchema);
    const adminSupabase = await getAdminSupabase();
    const identity = await resolveCompanionIdentity(request, adminSupabase);

    if (identity.kind === "user") {
      await deletePushSubscriptionForUser(adminSupabase, identity.id, body.endpoint);
    } else {
      await deleteAnonymousPushSubscription(
        adminSupabase,
        identity.id,
        body.endpoint,
      );
    }

    return attachCompanionCookie(apiSuccess({ subscribed: false }), identity);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
