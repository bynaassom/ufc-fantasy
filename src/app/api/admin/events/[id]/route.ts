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
import { getAdminEvent, updateAdminEventById } from "@/server/services/app";
import { adminEventSchema } from "@/server/validators/admin";

type Params = {
  params: { id: string };
};

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const event = await getAdminEvent(params.id);
    return apiSuccess({ event });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    assertSameOriginForMutation(request);
    await requireAdmin();
    const body = await parseJsonBody(request, adminEventSchema.partial());
    const event = await updateAdminEventById(params.id, body);
    revalidateTag(CACHE_TAGS.events);
    revalidatePath("/admin");
    if (event?.slug) {
      revalidatePath(`/event/${event.slug}`);
      revalidatePath(`/historico/${event.slug}`);
    }
    return apiSuccess({ event });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
