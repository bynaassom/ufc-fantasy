export async function getEventScoreForUserAndEvent(
  client: any,
  userId: string,
  eventId: string,
) {
  const { data, error } = await client
    .from("event_scores")
    .select("user_id, event_id, total_points, fights_scored, rank_position, perfect_picks")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getEventRankForUser(
  client: any,
  userId: string,
  eventId: string,
) {
  const { data, error } = await client
    .from("event_scores")
    .select("user_id, total_points, perfect_picks")
    .eq("event_id", eventId)
    .order("total_points", { ascending: false })
    .order("perfect_picks", { ascending: false });

  if (error) throw error;
  const index = (data || []).findIndex((entry: any) => entry.user_id === userId);
  return index >= 0 ? index + 1 : null;
}

export async function listEventLeaderboard(
  client: any,
  eventId: string,
  limit = 10,
) {
  const { data, error } = await client
    .from("event_scores")
    .select("user_id, total_points, perfect_picks, fights_scored, rank_position, profile:user_id!inner(id, nickname, first_name, last_name, total_points)")
    .eq("event_id", eventId)
    .order("total_points", { ascending: false })
    .order("perfect_picks", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function listEventScoresForRankMovement(
  client: any,
  eventId: string,
) {
  const { data, error } = await client
    .from("event_scores")
    .select("user_id, total_points, perfect_picks")
    .eq("event_id", eventId);

  if (error) throw error;
  return data || [];
}
