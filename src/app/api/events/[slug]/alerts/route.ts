export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  ApiRouteError,
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { requireActiveUser } from "@/server/auth/guards";
import {
  deleteFightAlert,
  listFightAlertsForUserEvent,
  saveFightAlert,
} from "@/server/repositories/fight-alerts";
import { getAdminSupabase } from "@/server/supabase";
import { fightAlertMutationSchema } from "@/server/validators/notifications";

type Params = { params: Promise<{ slug: string }> };

async function getEvent(client: Awaited<ReturnType<typeof getAdminSupabase>>, slug: string) {
  const { data, error } = await client
    .from("events")
    .select("id, status")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiRouteError(404, "EVENT_NOT_FOUND", "Evento não encontrado.");
  return data;
}

async function serializeState(
  client: Awaited<ReturnType<typeof getAdminSupabase>>,
  userId: string,
  eventId: string,
) {
  const subscriptions = await listFightAlertsForUserEvent(client, userId, eventId);
  const serializePreferences = (subscription: (typeof subscriptions)[number]) => ({
    upNext: subscription.notify_up_next,
    starting: subscription.notify_starting,
    results: subscription.notify_result,
  });
  const eventSubscription = subscriptions.find((subscription) => !subscription.fight_id);
  return {
    eventSubscription: eventSubscription
      ? serializePreferences(eventSubscription)
      : null,
    fightSubscriptions: Object.fromEntries(
      subscriptions
        .filter((subscription) => subscription.fight_id)
        .map((subscription) => [
          subscription.fight_id!,
          serializePreferences(subscription),
        ]),
    ),
  };
}

export async function GET(_request: NextRequest, props: Params) {
  try {
    const { user } = await requireActiveUser();
    const { slug } = await props.params;
    const client = await getAdminSupabase();
    const event = await getEvent(client, slug);
    return apiSuccess(await serializeState(client, user.id, event.id));
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

export async function PUT(request: NextRequest, props: Params) {
  try {
    assertSameOriginForMutation(request);
    const { user } = await requireActiveUser();
    const body = await parseJsonBody(request, fightAlertMutationSchema);
    const { slug } = await props.params;
    const client = await getAdminSupabase();
    const event = await getEvent(client, slug);
    const fightId = body.scope === "fight" ? body.fightId! : null;

    if (body.enabled && event.status === "completed") {
      throw new ApiRouteError(
        409,
        "EVENT_COMPLETED",
        "Este evento já foi encerrado.",
      );
    }

    if (fightId) {
      const { data: fight, error } = await client
        .from("fights")
        .select("id")
        .eq("id", fightId)
        .eq("event_id", event.id)
        .maybeSingle();
      if (error) throw error;
      if (!fight) {
        throw new ApiRouteError(404, "FIGHT_NOT_FOUND", "Luta não encontrada neste evento.");
      }
    }

    if (body.enabled) {
      await saveFightAlert(client, {
        userId: user.id,
        eventId: event.id,
        fightId,
        preferences: body.preferences!,
      });
    } else {
      await deleteFightAlert(client, { userId: user.id, eventId: event.id, fightId });
    }

    return apiSuccess(await serializeState(client, user.id, event.id));
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
