import type { DbClient } from "@/types/database";

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
  client: DbClient,
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
  client: DbClient,
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
  client: DbClient,
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

export async function getPickDistributionForEvent(client: any, eventId: string) {
  const { data: picksData, error: picksError } = await client
    .from("picks")
    .select("fight_id, picked_winner_id")
    .eq("event_id", eventId)
    .eq("is_confirmed", true);

  if (picksError) throw picksError;

  const { data: fightsData, error: fightsError } = await client
    .from("fights")
    .select("id, fighter_a_id, fighter_b_id")
    .eq("event_id", eventId);

  if (fightsError) throw fightsError;

  const fightMap = new Map<string, { fighter_a_id: string; fighter_b_id: string }>();
  for (const fight of fightsData || []) {
    fightMap.set(fight.id, { fighter_a_id: fight.fighter_a_id, fighter_b_id: fight.fighter_b_id });
  }

  const distribution: Record<string, { fighter_a: number; fighter_b: number }> = {};
  for (const row of picksData || []) {
    if (!distribution[row.fight_id]) {
      distribution[row.fight_id] = { fighter_a: 0, fighter_b: 0 };
    }
    const fight = fightMap.get(row.fight_id);
    if (!fight) continue;
    if (row.picked_winner_id === fight.fighter_a_id) {
      distribution[row.fight_id].fighter_a += 1;
    } else if (row.picked_winner_id === fight.fighter_b_id) {
      distribution[row.fight_id].fighter_b += 1;
    }
  }
  return distribution;
}
