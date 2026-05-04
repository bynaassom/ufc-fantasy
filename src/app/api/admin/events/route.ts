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
import { createAdminEvent } from "@/server/services/app";
import { adminEventSchema } from "@/server/validators/admin";

export async function POST(request: NextRequest) {
  try {
    assertSameOriginForMutation(request);
    await requireAdmin();
    const body = await parseJsonBody(request, adminEventSchema);
    const event = await createAdminEvent(body);
    revalidateTag(CACHE_TAGS.events);
    revalidatePath("/admin");
    if (event?.slug) {
      revalidatePath(`/event/${event.slug}`);
    }
    return apiSuccess({ event });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
