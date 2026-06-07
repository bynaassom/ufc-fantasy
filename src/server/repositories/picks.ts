const PICK_FIELDS = `
  id,
  user_id,
  fight_id,
  event_id,
  picked_winner_id,
  picked_method,
  picked_round,
  is_confirmed,
  confirmed_at,
  points_winner,
  points_method,
  points_round,
  total_points,
  created_at,
  updated_at
`;

export async function listPicksForUserEvent(
  client: any,
  userId: string,
  eventId: string,
) {
  const { data, error } = await client
    .from("picks")
    .select(PICK_FIELDS)
    .eq("user_id", userId)
    .eq("event_id", eventId);

  if (error) throw error;
  return data || [];
}

export async function listPicksForUser(client: any, userId: string) {
  const { data, error } = await client
    .from("picks")
    .select(PICK_FIELDS)
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
      ${PICK_FIELDS},
      fight:fights(
        id,
        card_type,
        fight_order,
        weight_class,
        winner_id,
        result_confirmed,
        fighter_a:fighters!fights_fighter_a_id_fkey(id, name),
        fighter_b:fighters!fights_fighter_b_id_fkey(id, name)
      )
    `,
    )
    .eq("event_id", eventId)
    .in("user_id", userIds);

  if (error) throw error;
  return data || [];
}

export async function listPerfectPickUsersForFight(client: any, fightId: string) {
  const { data, error } = await client
    .from("picks")
    .select("user_id, event_id, fight_id, total_points")
    .eq("fight_id", fightId)
    .eq("is_confirmed", true)
    .eq("total_points", 3);

  if (error) throw error;
  return data || [];
}

export async function countConfirmedPicksForFight(client: any, fightId: string) {
  const { count, error } = await client
    .from("picks")
    .select("id", { count: "exact", head: true })
    .eq("fight_id", fightId)
    .eq("is_confirmed", true);

  if (error) throw error;
  return count || 0;
}
