import { PROFILE_SELECT_FIELDS } from "@/lib/security";
import type { Profile } from "@/types";
import type { DbClient } from "@/types/database";

type ProfileUpdatePayload = Partial<{
  nickname: string;
  bio: string | null;
  favorite_fighter_id: string | null;
  onboarding_completed: boolean;
}>;

export async function findProfileById(
  client: DbClient,
  userId: string,
  fields = PROFILE_SELECT_FIELDS,
) {
  const { data, error } = await client
    .from("profiles")
    .select(fields)
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data as unknown as Profile | null;
}

export async function listRecentProfiles(client: any, limit = 100) {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function updateProfileNickname(
  client: DbClient,
  userId: string,
  nickname: string,
) {
  return updateProfile(client, userId, { nickname });
}

export async function updateProfile(
  client: DbClient,
  userId: string,
  payload: ProfileUpdatePayload,
) {
  const { data, error } = await client
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select(PROFILE_SELECT_FIELDS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfileRole(client: any, userId: string, role: string) {
  const { data, error } = await client
    .from("profiles")
    .update({ role })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfileBan(
  client: DbClient,
  userId: string,
  isBanned: boolean,
  reason?: string,
) {
  const payload: Record<string, unknown> = { is_banned: isBanned };
  if (reason !== undefined) payload.ban_reason = reason;
  if (!isBanned) payload.ban_reason = null;
  const { data, error } = await client
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function findPublicProfileByNickname(client: any, nickname: string) {
  const { data, error } = await client
    .from("ranking_profiles")
    .select("id, nickname, first_name, last_name, total_points, bio, favorite_fighter_id, followers_count, following_count")
    .eq("nickname", nickname)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findPublicProfilesByIds(client: any, userIds: string[]) {
  if (!userIds.length) return [];

  const { data, error } = await client
    .from("ranking_profiles")
    .select("id, nickname, first_name, last_name, total_points")
    .in("id", userIds);

  if (error) throw error;
  return data || [];
}

export async function listPublicProfiles(client: any, limit = 100) {
  const { data, error } = await client
    .from("ranking_profiles")
    .select("id, nickname, first_name, last_name, total_points")
    .order("total_points", { ascending: false })
    .order("nickname", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
