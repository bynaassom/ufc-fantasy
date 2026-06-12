export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { apiErrorFromUnknown, apiSuccess, assertSameOriginForMutation, parseJsonBody } from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { CACHE_TAGS } from "@/server/cache-tags";
import { updateAdminBadge, deleteAdminBadge, getAdminBadge } from "@/server/services/badges";
import { adminBadgePatchSchema } from "@/server/validators/admin";

type Params = { params: { id: string } };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const { adminSupabase } = await requireAdmin();
    const badge = await getAdminBadge(adminSupabase, params.id);
    if (!badge) return apiErrorFromUnknown(new Error("Badge não encontrado"));
    return apiSuccess({ badge });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    assertSameOriginForMutation(request);
    const { adminSupabase } = await requireAdmin();
    const body = await parseJsonBody(request, adminBadgePatchSchema);

    const updates: any = { ...body };
    if (body.name && !body.slug) {
      updates.slug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
    }

    const badge = await updateAdminBadge(adminSupabase, params.id, updates);

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
    await deleteAdminBadge(adminSupabase, params.id);

    revalidateTag(CACHE_TAGS.badges);
    revalidatePath("/admin");
    revalidatePath("/profile");

    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
