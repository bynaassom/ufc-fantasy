import type { DbClient } from "@/types/database";
import type { XpEvent, XpEventMetadata } from "@/types";

export type InsertXpEventInput = {
  userId: string;
  eventId: string;
  amount: number;
  reason: string;
  metadata: XpEventMetadata;
};

export async function insertXpEvent(
  client: DbClient,
  input: InsertXpEventInput,
): Promise<XpEvent | null> {
  const { data, error } = await client
    .from("xp_events")
    .upsert(
      {
        user_id: input.userId,
        event_id: input.eventId,
        amount: input.amount,
        reason: input.reason,
        metadata: input.metadata,
      },
      { onConflict: "user_id,event_id,reason", ignoreDuplicates: true },
    )
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as XpEvent) || null;
}

export async function listXpEventsForUser(
  client: DbClient,
  userId: string,
  limit = 50,
): Promise<XpEvent[]> {
  const { data, error } = await client
    .from("xp_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as unknown as XpEvent[];
}

export async function incrementProfileXp(
  client: DbClient,
  userId: string,
  amount: number,
): Promise<void> {
  if (amount === 0) return;
  const { error } = await client.rpc("increment_profile_xp", {
    p_user_id: userId,
    p_amount: amount,
  });
  if (error) throw error;
}

export async function updateProfileStreak(
  client: DbClient,
  userId: string,
  currentStreak: number,
  bestStreak: number,
): Promise<void> {
  const { error } = await client.rpc("update_profile_streak", {
    p_user_id: userId,
    p_current_streak: currentStreak,
    p_best_streak: bestStreak,
  });
  if (error) throw error;
}

export async function updateProfileLevel(
  client: DbClient,
  userId: string,
  level: number,
): Promise<void> {
  const { error } = await client
    .from("profiles")
    .update({ level })
    .eq("id", userId);
  if (error) throw error;
}
