export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
} from "@/server/api";
import { toggleFollow } from "@/server/services/follows";

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    assertSameOriginForMutation(request);
    const result = await toggleFollow(params.userId);
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
