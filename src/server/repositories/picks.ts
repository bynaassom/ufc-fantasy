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
