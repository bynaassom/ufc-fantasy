import { apiSuccess } from "@/server/api";
import { getBrowserPushPublicKey } from "@/server/services/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const publicKey = getBrowserPushPublicKey();
  return apiSuccess({
    enabled: Boolean(publicKey && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT),
    publicKey,
  });
}
