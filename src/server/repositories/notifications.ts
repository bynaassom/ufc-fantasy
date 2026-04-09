export async function createNotification(
  client: any,
  payload: Record<string, unknown>,
) {
  const { data, error } = await client
    .from("notifications")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listNotificationsForUser(
  client: any,
  userId: string,
  limit = 8,
) {
  const { data, error } = await client
    .from("notifications")
    .select("*")
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
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
