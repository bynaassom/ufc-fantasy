import type { DbClient } from "@/types/database";

const PUSH_SUBSCRIPTION_FIELDS = `
  id,
  user_id,
  endpoint,
  p256dh,
  auth,
  user_agent,
  created_at,
  updated_at
`;

export async function upsertPushSubscription(
  client: DbClient,
  payload: {
    user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    user_agent?: string | null;
  },
) {
  const { data, error } = await client
    .from("push_subscriptions")
    .upsert(payload, { onConflict: "user_id,endpoint" })
    .select(PUSH_SUBSCRIPTION_FIELDS)
    .single();

  if (error) throw error;
  return data;
}

export async function deletePushSubscriptionForUser(
  client: DbClient,
  userId: string,
  endpoint: string,
) {
  const { error } = await client
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);

  if (error) throw error;
}

export async function deletePushSubscriptionByEndpoint(
  client: DbClient,
  endpoint: string,
) {
  const { error } = await client
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) throw error;
}

export async function listPushSubscriptionsForUsers(
  client: DbClient,
  userIds: string[],
) {
  if (!userIds.length) return [];

  const { data, error } = await client
    .from("push_subscriptions")
    .select(PUSH_SUBSCRIPTION_FIELDS)
    .in("user_id", userIds);

  if (error) throw error;
  return data || [];
}
