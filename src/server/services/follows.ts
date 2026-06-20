import { requireActiveUser } from "@/server/auth/guards";
import {
  followUser as repoFollowUser,
  unfollowUser as repoUnfollowUser,
  isFollowing,
  listFollowers,
  listFollowing,
} from "@/server/repositories/follows";

export async function toggleFollow(followingId: string) {
  const { supabase, user } = await requireActiveUser();
  const following = await isFollowing(supabase, user.id, followingId);

  if (following) {
    await repoUnfollowUser(supabase, user.id, followingId);
    return { following: false };
  } else {
    await repoFollowUser(supabase, user.id, followingId);
    return { following: true };
  }
}

export async function getFollowersForUser(userId: string, limit = 20) {
  const { supabase } = await requireActiveUser();
  return listFollowers(supabase, userId, limit);
}

export async function getFollowingForUser(userId: string, limit = 20) {
  const { supabase } = await requireActiveUser();
  return listFollowing(supabase, userId, limit);
}
