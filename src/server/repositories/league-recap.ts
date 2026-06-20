import type { DbClient } from "@/types/database";

export async function getUserLeagueIds(
  client: DbClient,
  userId: string,
): Promise<{ group_id: string; group_name: string }[]> {
  const { data, error } = await client
    .from("group_members")
    .select("group_id, group:group_id(name)")
    .eq("user_id", userId);

  if (error) throw error;
  return (data || []).map((r: any) => ({
    group_id: r.group_id,
    group_name: r.group?.name || "—",
  }));
}

export async function getGroupMembers(
  client: DbClient,
  groupId: string,
): Promise<{ userId: string; name: string; nickname: string }[]> {
  const { data, error } = await client
    .from("group_members")
    .select("user_id, profile:user_id(first_name, last_name, nickname)")
    .eq("group_id", groupId);

  if (error) throw error;
  return (data || []).map((r: any) => ({
    userId: r.user_id,
    name: r.profile
      ? [r.profile.first_name, r.profile.last_name].filter(Boolean).join(" ") || r.profile.nickname
      : "—",
    nickname: r.profile?.nickname || "—",
  }));
}

export async function getMemberEventScore(
  client: DbClient,
  userId: string,
  eventId: string,
): Promise<{ totalPoints: number } | null> {
  const { data, error } = await client
    .from("event_scores")
    .select("total_points")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) throw error;
  return data ? { totalPoints: data.total_points } : null;
}

export async function getPreviousCompletedEventId(
  client: DbClient,
  eventId: string,
): Promise<string | null> {
  const { data: current } = await client
    .from("events")
    .select("event_date")
    .eq("id", eventId)
    .single();

  if (!current) return null;

  const { data, error } = await client
    .from("events")
    .select("id")
    .eq("status", "completed")
    .lt("event_date", current.event_date)
    .order("event_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id || null;
}
