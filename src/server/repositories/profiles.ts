import { PROFILE_SELECT_FIELDS } from "@/lib/security";

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
  const { data, error } = await client
    .from("profiles")
    .update({ nickname })
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
