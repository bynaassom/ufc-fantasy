export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
} from "@/server/api";
import { hideChatMessage } from "@/server/services/chat";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    assertSameOriginForMutation(request);
    await hideChatMessage(params.id);
    return apiSuccess({ hidden: true });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
