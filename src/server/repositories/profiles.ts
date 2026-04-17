import { PROFILE_SELECT_FIELDS } from "@/lib/security";
import type { CompetitiveDivision } from "@/lib/ufc-weight";

type ProfileUpdatePayload = Partial<{
  nickname: string;
  division: CompetitiveDivision;
  division_confirmed: boolean;
}>;

export async function findProfileById(
  client: any,
  userId: string,
  fields = PROFILE_SELECT_FIELDS,
) {
  const { data, error } = await client
    .from("profiles")
    .select(fields)
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
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
  client: any,
  userId: string,
  nickname: string,
) {
  return updateProfile(client, userId, { nickname });
}

export async function updateProfile(
  client: any,
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
  client: any,
  userId: string,
  isBanned: boolean,
) {
  const { data, error } = await client
    .from("profiles")
    .update({ is_banned: isBanned })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function findPublicProfileByNickname(client: any, nickname: string) {
  const { data, error } = await client
    .from("ranking_profiles")
    .select("id, nickname, first_name, last_name, total_points")
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

export async function listPublicProfilesByDivision(
  client: any,
  division: CompetitiveDivision,
  limit = 100,
) {
  const { data, error } = await client
    .from("ranking_profiles")
    .select("id, nickname, first_name, last_name, total_points, division")
    .eq("division", division)
    .order("total_points", { ascending: false })
    .order("nickname", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
