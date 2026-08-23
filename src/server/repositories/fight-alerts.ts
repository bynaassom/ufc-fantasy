import type { DbClient } from "@/types/database";

export type FightAlertSubscription = {
  id: string;
  user_id: string;
  event_id: string;
  fight_id: string | null;
  created_at: string;
};

const FIELDS = "id, user_id, event_id, fight_id, created_at";

export async function listFightAlertsForUserEvent(
  client: DbClient,
  userId: string,
  eventId: string,
) {
  const { data, error } = await client
    .from("fight_alert_subscriptions")
    .select(FIELDS)
    .eq("user_id", userId)
    .eq("event_id", eventId);

  if (error) throw error;
  return (data || []) as FightAlertSubscription[];
}

export async function createFightAlert(
  client: DbClient,
  input: { userId: string; eventId: string; fightId: string | null },
) {
  const query = client
    .from("fight_alert_subscriptions")
    .select("id")
    .eq("user_id", input.userId)
    .eq("event_id", input.eventId);
  const scopedQuery = input.fightId
    ? query.eq("fight_id", input.fightId)
    : query.is("fight_id", null);
  const { data: existing, error: existingError } = await scopedQuery.maybeSingle();
  if (existingError) throw existingError;
  if (existing) return;

  const { error } = await client.from("fight_alert_subscriptions").insert({
    user_id: input.userId,
    event_id: input.eventId,
    fight_id: input.fightId,
  });
  if (error && error.code !== "23505") throw error;
}

export async function deleteFightAlert(
  client: DbClient,
  input: { userId: string; eventId: string; fightId: string | null },
) {
  const query = client
    .from("fight_alert_subscriptions")
    .delete()
    .eq("user_id", input.userId)
    .eq("event_id", input.eventId);
  const { error } = input.fightId
    ? await query.eq("fight_id", input.fightId)
    : await query.is("fight_id", null);
  if (error) throw error;
}

export async function listFightAlertRecipientIds(
  client: DbClient,
  eventId: string,
  fightId: string,
) {
  const { data, error } = await client
    .from("fight_alert_subscriptions")
    .select("user_id")
    .eq("event_id", eventId)
    .or(`fight_id.is.null,fight_id.eq.${fightId}`);
  if (error) throw error;

  const userIds = Array.from(
    new Set((data || []).map((row: { user_id: string }) => row.user_id)),
  );
  if (!userIds.length) return [];

  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select("id")
    .in("id", userIds)
    .eq("is_banned", false);
  if (profilesError) throw profilesError;
  return (profiles || []).map((profile: { id: string }) => profile.id);
}
