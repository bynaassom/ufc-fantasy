export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { getFighterProfileData } from "@/server/services/fighter-profile";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const data = await getFighterProfileData(params.slug);
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
