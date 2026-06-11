import type { DbClient } from "@/types/database";

export async function createChallenge(
  client: DbClient,
  payload: Record<string, unknown>,
) {
  const { data, error } = await client
    .from("challenges")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateChallenge(
  client: DbClient,
  challengeId: string,
  payload: Record<string, unknown>,
) {
  const { data, error } = await client
    .from("challenges")
    .update(payload)
    .eq("id", challengeId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function findChallengeById(client: any, challengeId: string) {
  const { data, error } = await client
    .from("challenges")
    .select(
      `
      *,
      event:events(*)
    `,
    )
    .eq("id", challengeId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listChallengesForUser(client: any, userId: string) {
  const { data, error } = await client
    .from("challenges")
    .select(
      `
      *,
      event:events(*)
    `,
    )
    .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listChallengesForProfile(client: any, profileId: string) {
  const { data, error } = await client
    .from("challenges")
    .select(
      `
      *,
      event:events(*)
    `,
    )
    .or(`challenger_id.eq.${profileId},challenged_id.eq.${profileId}`);

  if (error) throw error;
  return data || [];
}

export async function findActiveChallengeBetweenUsers(
  client: DbClient,
  eventId: string,
  leftUserId: string,
  rightUserId: string,
) {
  const { data, error } = await client
    .from("challenges")
    .select(
      `
      *,
      event:events(*)
    `,
    )
    .eq("event_id", eventId)
    .in("status", ["pending", "accepted"])
    .or(
      `and(challenger_id.eq.${leftUserId},challenged_id.eq.${rightUserId}),and(challenger_id.eq.${rightUserId},challenged_id.eq.${leftUserId})`,
    )
    .maybeSingle();

  if (error) throw error;
  return data;
}
