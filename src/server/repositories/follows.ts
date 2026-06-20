import type { DbClient } from "@/types/database";

export async function isFollowing(
  client: DbClient,
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("user_follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

export async function followUser(
  client: DbClient,
  followerId: string,
  followingId: string,
): Promise<void> {
  if (followerId === followingId) throw new Error("Cannot follow yourself");

  const { error } = await client.from("user_follows").insert({
    follower_id: followerId,
    following_id: followingId,
  });

  if (error) {
    if (error.code === "23505") return; // already following, OK
    throw error;
  }

  // Update counters
  await client.rpc("update_follow_counters", {
    p_follower_id: followerId,
    p_following_id: followingId,
    p_increment: true,
  });
}

export async function unfollowUser(
  client: DbClient,
  followerId: string,
  followingId: string,
): Promise<void> {
  const { error } = await client
    .from("user_follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);

  if (error) throw error;

  await client.rpc("update_follow_counters", {
    p_follower_id: followerId,
    p_following_id: followingId,
    p_increment: false,
  });
}

export async function listFollowers(
  client: DbClient,
  userId: string,
  limit = 20,
): Promise<any[]> {
  const { data, error } = await client
    .from("user_follows")
    .select("follower_id, created_at, profile:follower_id(nickname, first_name, last_name)")
    .eq("following_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function listFollowing(
  client: DbClient,
  userId: string,
  limit = 20,
): Promise<any[]> {
  const { data, error } = await client
    .from("user_follows")
    .select("following_id, created_at, profile:following_id(nickname, first_name, last_name)")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
