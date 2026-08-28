export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { CACHE_TAGS } from "@/server/cache-tags";
import { logAdminAction } from "@/lib/admin-audit";
import {
  deleteAdminEventById,
  getAdminEvent,
  updateAdminEventById,
} from "@/server/services/app";
import { adminEventSchema } from "@/server/validators/admin";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: NextRequest, props: Params) {
  const params = await props.params;
  try {
    await requireAdmin();
    const event = await getAdminEvent(params.id);
    return apiSuccess({ event });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

export async function PATCH(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    assertSameOriginForMutation(request);
    const auth = await requireAdmin();
    const body = await parseJsonBody(request, adminEventSchema.partial());
    const previousEvent = Object.hasOwn(body, "is_bonus")
      ? await getAdminEvent(params.id)
      : null;
    const event = await updateAdminEventById(params.id, body);
    revalidateTag(CACHE_TAGS.events, "max");
    revalidateTag(CACHE_TAGS.ranking, "max");
    revalidateTag(CACHE_TAGS.stats, "max");
    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/ranking");
    revalidatePath("/historico");
    if (event?.slug) {
      revalidatePath(`/event/${event.slug}`);
      revalidatePath(`/historico/${event.slug}`);
    }
    if (previousEvent && previousEvent.is_bonus !== event.is_bonus) {
      await logAdminAction(auth.adminSupabase, {
        userId: auth.user.id,
        action: "admin_event_ranking_mode",
        details: {
          event_id: event.id,
          event_name: event.name,
          is_bonus: event.is_bonus,
        },
      });
    }
    return apiSuccess({ event });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

export async function DELETE(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    assertSameOriginForMutation(request);
    const auth = await requireAdmin();
    const event = await deleteAdminEventById(params.id);

    await logAdminAction(auth.adminSupabase, {
      userId: auth.user.id,
      action: "admin_event_deleted",
      details: {
        event_id: event.id,
        event_name: event.name,
        event_slug: event.slug,
      },
    });

    revalidateTag(CACHE_TAGS.events, "max");
    revalidateTag(CACHE_TAGS.ranking, "max");
    revalidateTag(CACHE_TAGS.stats, "max");
    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/ranking");
    revalidatePath("/historico");
    revalidatePath(`/event/${event.slug}`);
    revalidatePath(`/historico/${event.slug}`);

    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
