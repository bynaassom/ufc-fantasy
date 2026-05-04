export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";
import { createAdminFightForEvent } from "@/server/services/app";
import { listEventFights } from "@/server/repositories/fights";
import { getAdminSupabase } from "@/server/supabase";
import { adminFightSchema } from "@/server/validators/admin";

type Params = {
  params: { id: string };
};

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const adminSupabase = await getAdminSupabase();
    const fights = await listEventFights(adminSupabase, params.id);
    return apiSuccess({ fights });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    assertSameOriginForMutation(request);
    await requireAdmin();
    const body = await parseJsonBody(request, adminFightSchema);
    const fight = await createAdminFightForEvent(params.id, body);
    return apiSuccess({ fight });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
