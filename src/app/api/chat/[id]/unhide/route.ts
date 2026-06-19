export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
} from "@/server/api";
import { unhideChatMessage } from "@/server/services/chat";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    assertSameOriginForMutation(request);
    await unhideChatMessage(params.id);
    return apiSuccess({ hidden: false });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
