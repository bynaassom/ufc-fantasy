import { getAdminSupabase } from "@/server/supabase";
import {
  insertActivity,
  listActivityForUsers,
} from "@/server/repositories/activity";
import { listFollowing } from "@/server/repositories/follows";
import type { ActivityType, ActivityFeedItem } from "@/types";

export async function logActivity(
  userId: string,
  type: ActivityType,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    const admin = await getAdminSupabase();
    await insertActivity(admin, userId, type, metadata);
  } catch {
    // Silent catch — activity logging never breaks main flows
  }
}

export async function getFeedForUser(
  userId: string,
  before?: string | null,
  limit = 20,
): Promise<{ items: ActivityFeedItem[]; hasMore: boolean; nextCursor: string | null }> {
  const admin = await getAdminSupabase();
  const following = await listFollowing(admin, userId, 1000);
  const followingIds = following.map((f: any) => f.following_id);

  if (followingIds.length === 0) {
    return { items: [], hasMore: false, nextCursor: null };
  }

  // Include self in feed so users see their own activity too
  const feedUserIds = [userId, ...followingIds];

  const result = await listActivityForUsers(admin, feedUserIds, before, limit);
  const last = result.items[result.items.length - 1];

  return {
    items: result.items as ActivityFeedItem[],
    hasMore: result.hasMore,
    nextCursor: last?.created_at ?? null,
  };
}
