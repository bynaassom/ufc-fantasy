export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { ApiRouteError, apiErrorFromUnknown, apiSuccess, assertSameOriginForMutation, parseJsonBody } from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { CACHE_TAGS } from "@/server/cache-tags";
import { updateAdminBadge, deleteAdminBadge, getAdminBadge } from "@/server/services/badges";
import { assertBadgeSlug, slugifyBadgeName } from "@/server/services/badge-admin-utils";
import { adminBadgePatchSchema } from "@/server/validators/admin";
import { z } from "zod";

type Params = { params: { id: string } | Promise<{ id: string }> };

async function getBadgeId(params: Params["params"]) {
  const resolved = await params;
  return z.string().uuid().parse(resolved.id);
}

export async function GET(_: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const { adminSupabase } = await requireAdmin();
    const badge = await getAdminBadge(adminSupabase, await getBadgeId(params));
    if (!badge) throw new ApiRouteError(404, "BADGE_NOT_FOUND", "Badge não encontrado.");
    return apiSuccess({ badge });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

export async function PATCH(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    assertSameOriginForMutation(request);
    const { adminSupabase } = await requireAdmin();
    const badgeId = await getBadgeId(params);
    const body = await parseJsonBody(request, adminBadgePatchSchema);

    const updates: any = { ...body };
    if (body.name && !body.slug) {
      updates.slug = slugifyBadgeName(body.name);
    }
    if (updates.slug) updates.slug = assertBadgeSlug(updates.slug);

    const badge = await updateAdminBadge(adminSupabase, badgeId, updates);
    if (!badge) throw new ApiRouteError(404, "BADGE_NOT_FOUND", "Badge não encontrado.");

    revalidateTag(CACHE_TAGS.badges, "max");
    revalidatePath("/admin");
    revalidatePath("/profile");

    return apiSuccess({ badge });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

export async function DELETE(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    assertSameOriginForMutation(request);
    const { adminSupabase } = await requireAdmin();
    const deleted = await deleteAdminBadge(adminSupabase, await getBadgeId(params));
    if (!deleted) throw new ApiRouteError(404, "BADGE_NOT_FOUND", "Badge não encontrado.");

    revalidateTag(CACHE_TAGS.badges, "max");
    revalidatePath("/admin");
    revalidatePath("/profile");

    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
