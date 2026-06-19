export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { getAdminChatMessages } from "@/server/services/chat";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before");
    const groupId = searchParams.get("groupId");
    const hidden = searchParams.get("hidden");
    const showHidden = hidden === "true" ? true : hidden === "false" ? false : null;
    const data = await getAdminChatMessages(
      before || null,
      groupId || null,
      showHidden,
    );
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
