export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  ApiRouteError,
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { CACHE_TAGS } from "@/server/cache-tags";
import { awardAdminBadgeToUsers, getAdminBadge } from "@/server/services/badges";
import { adminBadgeAwardSchema } from "@/server/validators/admin";
import { z } from "zod";

type Params = { params: { id: string } | Promise<{ id: string }> };

async function getBadgeId(params: Params["params"]) {
  const resolved = await params;
  return z.string().uuid().parse(resolved.id);
}

export async function POST(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    assertSameOriginForMutation(request);
    const { adminSupabase } = await requireAdmin();
    const badgeId = await getBadgeId(params);
    const body = await parseJsonBody(request, adminBadgeAwardSchema);

    const badge = await getAdminBadge(adminSupabase, badgeId);
    if (!badge) throw new ApiRouteError(404, "BADGE_NOT_FOUND", "Badge não encontrado.");

    const result = await awardAdminBadgeToUsers(
      adminSupabase,
      badgeId,
      body.userIds,
    );

    revalidateTag(CACHE_TAGS.badges, "max");
    revalidatePath("/admin");
    revalidatePath("/profile");

    return apiSuccess(result);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
