export async function listPicksForUserEvent(
  client: any,
  userId: string,
  eventId: string,
) {
  const { data, error } = await client
    .from("picks")
    .select("*")
    .eq("user_id", userId)
    .eq("event_id", eventId);

  if (error) throw error;
  return data || [];
}

export async function listPicksForUser(client: any, userId: string) {
  const { data, error } = await client
    .from("picks")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  return data || [];
}

export async function upsertUserPicks(
  client: any,
  payload: Record<string, unknown>[],
) {
  const { data, error } = await client
    .from("picks")
    .upsert(payload, { onConflict: "user_id,fight_id" })
    .select("*");

  if (error) throw error;
  return data || [];
}

export async function listPicksForUsersEvent(
  client: any,
  userIds: string[],
  eventId: string,
) {
  const { data, error } = await client
    .from("picks")
    .select(
      `
      *,
      fight:fights(
        *,
        fighter_a:fighters!fights_fighter_a_id_fkey(*),
        fighter_b:fighters!fights_fighter_b_id_fkey(*),
        winner:fighters!fights_winner_id_fkey(*)
      )
    `,
    )
    .eq("event_id", eventId)
    .in("user_id", userIds);

  if (error) throw error;
  return data || [];
}
