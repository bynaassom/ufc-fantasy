export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { getEventLiveData } from "@/server/services/app";

type Params = { params: { slug: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const data = await getEventLiveData(params.slug);
    return apiSuccess(data);
  } catch (e) {
    return apiErrorFromUnknown(e);
  }
}
