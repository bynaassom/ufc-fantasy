export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  ApiRouteError,
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import {
  deleteAnonymousFightAlert,
  deleteFightAlert,
  listAnonymousFightAlertsForEvent,
  listFightAlertsForUserEvent,
  saveAnonymousFightAlert,
  saveFightAlert,
} from "@/server/repositories/fight-alerts";
import { getAdminSupabase } from "@/server/supabase";
import { fightAlertMutationSchema } from "@/server/validators/notifications";
import {
  attachCompanionCookie,
  resolveCompanionIdentity,
  type CompanionIdentity,
} from "@/server/anonymous-companion";

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
  identity: CompanionIdentity,
  eventId: string,
) {
  const subscriptions = identity.kind === "user"
    ? await listFightAlertsForUserEvent(client, identity.id, eventId)
    : await listAnonymousFightAlertsForEvent(client, identity.id, eventId);
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
    const { slug } = await props.params;
    const client = await getAdminSupabase();
    const identity = await resolveCompanionIdentity(_request, client);
    const event = await getEvent(client, slug);
    const response = apiSuccess(await serializeState(client, identity, event.id));
    return attachCompanionCookie(response, identity);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

export async function PUT(request: NextRequest, props: Params) {
  try {
    assertSameOriginForMutation(request);
    const body = await parseJsonBody(request, fightAlertMutationSchema);
    const { slug } = await props.params;
    const client = await getAdminSupabase();
    const identity = await resolveCompanionIdentity(request, client);
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
      if (identity.kind === "user") {
        await saveFightAlert(client, {
          userId: identity.id,
          eventId: event.id,
          fightId,
          preferences: body.preferences!,
        });
      } else {
        await saveAnonymousFightAlert(client, {
          anonymousId: identity.id,
          eventId: event.id,
          fightId,
          preferences: body.preferences!,
        });
      }
    } else {
      if (identity.kind === "user") {
        await deleteFightAlert(client, {
          userId: identity.id,
          eventId: event.id,
          fightId,
        });
      } else {
        await deleteAnonymousFightAlert(client, {
          anonymousId: identity.id,
          eventId: event.id,
          fightId,
        });
      }
    }

    const response = apiSuccess(await serializeState(client, identity, event.id));
    return attachCompanionCookie(response, identity);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
