import { requireActiveUser } from "@/server/auth/guards";
import {
  followUser as repoFollowUser,
  unfollowUser as repoUnfollowUser,
  isFollowing,
  listFollowers,
  listFollowing,
} from "@/server/repositories/follows";
import { getAdminSupabase } from "@/server/supabase";

export async function toggleFollow(followingId: string) {
  const { supabase, user } = await requireActiveUser();
  const following = await isFollowing(supabase, user.id, followingId);

  if (following) {
    await repoUnfollowUser(supabase, user.id, followingId);
  } else {
    await repoFollowUser(supabase, user.id, followingId);
  }

  const admin = await getAdminSupabase();
  const { data: profile } = await admin
    .from("profiles")
    .select("followers_count, following_count")
    .eq("id", followingId)
    .single();

  return {
    following: !following,
    followersCount: profile?.followers_count ?? 0,
    followingCount: profile?.following_count ?? 0,
  };
}

export async function getFollowersForUser(userId: string, limit = 20) {
  const { supabase } = await requireActiveUser();
  return listFollowers(supabase, userId, limit);
}

export async function getFollowingForUser(userId: string, limit = 20) {
  const { supabase } = await requireActiveUser();
  return listFollowing(supabase, userId, limit);
}
