export const dynamic = "force-dynamic";

import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
import { logAdminAction } from "@/lib/admin-audit";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { CACHE_TAGS } from "@/server/cache-tags";
import { setAdminFightResult } from "@/server/services/app";
import { adminFightResultSchema } from "@/server/validators/admin";

type Params = {
  params: { fightId: string };
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    assertSameOriginForMutation(request);
    const { adminSupabase, user } = await requireAdmin();
    const body = await parseJsonBody(request, adminFightResultSchema);
    const data = await setAdminFightResult(params.fightId, body);

    revalidatePath("/ranking");
    revalidatePath("/home");
    revalidateTag(CACHE_TAGS.ranking);
    revalidateTag(CACHE_TAGS.events);
    const eventSlug = (data.fight?.event as any)?.slug;
    if (eventSlug) {
      revalidatePath(`/event/${eventSlug}`);
      revalidatePath(`/historico/${eventSlug}`);
    }

    await logAdminAction(adminSupabase, {
      userId: user.id,
      action: "admin_score_fight",
      details: {
        fight_id: params.fightId,
        event_slug: eventSlug || null,
      },
    });

    return apiSuccess({ scored: true, resultRound: data.resultRound });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
