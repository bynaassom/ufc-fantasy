export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { apiErrorFromUnknown, apiSuccess, assertSameOriginForMutation, parseJsonBody } from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { CACHE_TAGS } from "@/server/cache-tags";
import { createAdminBadge } from "@/server/services/badges";
import { listBadges } from "@/server/repositories/badges";
import { adminBadgeSchema } from "@/server/validators/admin";

export async function GET() {
  try {
    const { adminSupabase } = await requireAdmin();
    const badges = await listBadges(adminSupabase);
    return apiSuccess({ badges });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOriginForMutation(request);
    const { adminSupabase } = await requireAdmin();
    const body = await parseJsonBody(request, adminBadgeSchema);

    const slug = body.slug || body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    const badge = await createAdminBadge(adminSupabase, {
      name: body.name,
      slug,
      description: body.description,
      category: body.category,
      icon_name: body.icon_name,
      tier: body.tier ?? 1,
      sort_order: body.sort_order ?? 0,
    });

    revalidateTag(CACHE_TAGS.badges);
    revalidatePath("/admin");
    revalidatePath("/profile");

    return apiSuccess({ badge });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
