export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { apiErrorFromUnknown, apiSuccess, assertSameOriginForMutation, parseJsonBody } from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { CACHE_TAGS } from "@/server/cache-tags";
import { createAdminBadge } from "@/server/services/badges";
import { assertBadgeSlug, slugifyBadgeName } from "@/server/services/badge-admin-utils";
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

    const slug = assertBadgeSlug(body.slug || slugifyBadgeName(body.name));

    const badge = await createAdminBadge(adminSupabase, {
      name: body.name,
      slug,
      description: body.description,
      category: body.category,
      icon_name: body.icon_name,
      tier: body.tier,
      sort_order: body.sort_order,
      award_mode: body.award_mode,
      criteria_description: body.criteria_description || null,
      notification_title: body.notification_title || null,
      notification_message: body.notification_message || null,
    });

    revalidateTag(CACHE_TAGS.badges, "max");
    revalidatePath("/admin");
    revalidatePath("/profile");

    return apiSuccess({ badge });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
