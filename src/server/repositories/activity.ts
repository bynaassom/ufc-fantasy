import type { DbClient } from "@/types/database";
import type { UserActivity, ActivityType } from "@/types";

export async function insertActivity(
  client: DbClient,
  userId: string,
  type: ActivityType,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await client.from("user_activity").insert({
    user_id: userId,
    type,
    metadata,
  });

  if (error) throw error;
}

export async function listActivityForUsers(
  client: DbClient,
  userIds: string[],
  before?: string | null,
  limit = 20,
): Promise<{ items: UserActivity[]; hasMore: boolean }> {
  let query = client
    .from("user_activity")
    .select("id, user_id, type, metadata, created_at, profile:user_id(nickname, first_name, last_name)")
    .in("user_id", userIds)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;

  if (error) throw error;

  const items = (data || []) as unknown as UserActivity[];
  const hasMore = items.length > limit;

  return {
    items: hasMore ? items.slice(0, limit) : items,
    hasMore,
  };
}
