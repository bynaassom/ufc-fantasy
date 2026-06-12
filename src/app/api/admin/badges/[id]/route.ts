export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { ApiRouteError, apiErrorFromUnknown, apiSuccess, assertSameOriginForMutation, parseJsonBody } from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { CACHE_TAGS } from "@/server/cache-tags";
import { updateAdminBadge, deleteAdminBadge, getAdminBadge } from "@/server/services/badges";
import { adminBadgePatchSchema } from "@/server/validators/admin";

type Params = { params: { id: string } | Promise<{ id: string }> };

async function getBadgeId(params: Params["params"]) {
  const resolved = await params;
  return resolved.id;
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const { adminSupabase } = await requireAdmin();
    const badge = await getAdminBadge(adminSupabase, await getBadgeId(params));
    if (!badge) throw new ApiRouteError(404, "BADGE_NOT_FOUND", "Badge não encontrado.");
    return apiSuccess({ badge });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    assertSameOriginForMutation(request);
    const { adminSupabase } = await requireAdmin();
    const badgeId = await getBadgeId(params);
    const body = await parseJsonBody(request, adminBadgePatchSchema);

    const updates: any = { ...body };
    if (body.name && !body.slug) {
      updates.slug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
    }

    const badge = await updateAdminBadge(adminSupabase, badgeId, updates);
    if (!badge) throw new ApiRouteError(404, "BADGE_NOT_FOUND", "Badge não encontrado.");

    revalidateTag(CACHE_TAGS.badges);
    revalidatePath("/admin");
    revalidatePath("/profile");

    return apiSuccess({ badge });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    assertSameOriginForMutation(request);
    const { adminSupabase } = await requireAdmin();
    await deleteAdminBadge(adminSupabase, await getBadgeId(params));

    revalidateTag(CACHE_TAGS.badges);
    revalidatePath("/admin");
    revalidatePath("/profile");

    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
