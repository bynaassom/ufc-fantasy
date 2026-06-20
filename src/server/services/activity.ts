import { getAdminSupabase } from "@/server/supabase";
import {
  insertActivity,
  listActivityForFollower,
} from "@/server/repositories/activity";
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
  type?: string | null,
): Promise<{ items: ActivityFeedItem[]; hasMore: boolean; nextCursor: string | null }> {
  const admin = await getAdminSupabase();
  const result = await listActivityForFollower(admin, userId, before, limit, type);
  const last = result.items[result.items.length - 1];

  return {
    items: result.items as ActivityFeedItem[],
    hasMore: result.hasMore,
    nextCursor: last?.created_at ?? null,
  };
}
