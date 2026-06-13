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
  sendMessage,
  getMessages,
  pollNewMessages,
} from "@/server/services/chat";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before");
    const since = searchParams.get("since");
    const groupId = searchParams.get("groupId");

    if (since) {
      const messages = await pollNewMessages(since, groupId);
      return apiSuccess({ messages });
    }

    const result = await getMessages(before, groupId);
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

const sendMessageSchema = z.object({
  content: z.string().min(1).max(500),
  groupId: z.string().uuid().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    assertSameOriginForMutation(request);
    const body = await parseJsonBody(request, sendMessageSchema);
    const message = await sendMessage(body.content, body.groupId);
    return apiSuccess({ message }, { status: 201 });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
