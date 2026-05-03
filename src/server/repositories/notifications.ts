const NOTIFICATION_FIELDS = `
  id,
  user_id,
  type,
  title,
  message,
  target_path,
  challenge_id,
  event_id,
  fight_id,
  dedupe_key,
  read_at,
  created_at
`;

export async function createNotification(
  client: any,
  payload: Record<string, unknown>,
) {
  const { data, error } = await client
    .from("notifications")
    .insert(payload)
    .select(NOTIFICATION_FIELDS)
    .single();

  if (error) throw error;
  return data;
}

export async function createNotificationOnce(
  client: any,
  payload: Record<string, unknown>,
) {
  const { data, error } = await client
    .from("notifications")
    .insert(payload)
    .select(NOTIFICATION_FIELDS)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }

  return data;
}

export async function listActiveNotificationRecipients(client: any) {
  const { data, error } = await client
    .from("profiles")
    .select("id, is_banned")
    .eq("is_banned", false);

  if (error) throw error;
  return data || [];
}

export async function listConfirmedPickUsersForEvent(
  client: any,
  eventId: string,
) {
  const { data, error } = await client
    .from("picks")
    .select("user_id, event_id, is_confirmed")
    .eq("event_id", eventId)
    .eq("is_confirmed", true);

  if (error) throw error;
  return data || [];
}

export async function listNotificationsForUser(
  client: any,
  userId: string,
  limit = 8,
) {
  const { data, error } = await client
    .from("notifications")
    .select(NOTIFICATION_FIELDS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function countUnreadNotifications(client: any, userId: string) {
  const { count, error } = await client
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw error;
  return count || 0;
}

export async function markNotificationAsRead(
  client: any,
  notificationId: string,
  userId: string,
) {
  const { data, error } = await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select(NOTIFICATION_FIELDS)
    .single();

  if (error) throw error;
  return data;
}
