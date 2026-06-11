export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import {
  createGroupWithMember,
  getMyGroups,
} from "@/server/services/app";

export async function GET() {
  try {
    const groups = await getMyGroups();
    return apiSuccess(groups);
  } catch (e) {
    return apiErrorFromUnknown(e);
  }
}

const createGroupSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    assertSameOriginForMutation(request);
    const body = await parseJsonBody(request, createGroupSchema);
    const group = await createGroupWithMember(body.name, body.description ?? null);
    return apiSuccess(group, { status: 201 });
  } catch (e) {
    return apiErrorFromUnknown(e);
  }
}
