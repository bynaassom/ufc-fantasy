export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { requireActiveUser } from "@/server/auth/guards";
import { getAdminSupabase } from "@/server/supabase";
import { evaluateAndGetBadges } from "@/server/services/badges";

export async function GET(_request: NextRequest) {
  try {
    const { user } = await requireActiveUser();
    const adminSupabase = await getAdminSupabase();
    const badges = await evaluateAndGetBadges(adminSupabase, user.id);
    return apiSuccess({ badges });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
