export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
  parseJsonBody,
} from "@/server/api";
import type { NotificationPreferences } from "@/types";
import {
  getMyNotificationPreferences,
  updateMyNotificationPreferences,
} from "@/server/services/app";

const NOTIFICATION_KEYS: (keyof NotificationPreferences)[] = [
  "picks_opened",
  "picks_closed",
  "picks_reminders",
  "card_updated",
  "perfect_pick",
  "challenge_received",
  "challenge_accepted",
  "challenge_declined",
  "challenge_result",
  "badge_earned",
];

const updateNotificationPreferencesSchema = z.object(
  Object.fromEntries(NOTIFICATION_KEYS.map((key) => [key, z.boolean()])),
);

export async function GET() {
  try {
    const preferences = await getMyNotificationPreferences();
    return apiSuccess({ preferences });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    assertSameOriginForMutation(request);
    const body = await parseJsonBody(request, updateNotificationPreferencesSchema);
    const preferences = await updateMyNotificationPreferences(body as NotificationPreferences);
    return apiSuccess({ preferences });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
