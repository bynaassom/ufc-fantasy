import type { DbClient } from "@/types/database";

export async function createGroup(
  client: DbClient,
  payload: { name: string; description: string | null; invite_code: string; created_by: string },
) {
  const { data, error } = await client
    .from("groups")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function addGroupMember(
  client: DbClient,
  payload: { group_id: string; user_id: string; role: string },
) {
  const { data, error } = await client
    .from("group_members")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function removeGroupMember(client: DbClient, groupId: string, userId: string) {
  const { error } = await client
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function findGroupById(client: DbClient, groupId: string) {
  const { data, error } = await client
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();
  if (error) throw error;
  return data;
}

export async function findGroupByInviteCode(client: DbClient, code: string) {
  const { data, error } = await client
    .from("groups")
    .select("*")
    .eq("invite_code", code)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listGroupsForUser(client: DbClient, userId: string) {
  const { data, error } = await client
    .from("group_members")
    .select("group:groups(*)")
    .eq("user_id", userId);
  if (error) throw error;
  return (data || []).map((row: any) => row.group);
}

export async function listGroupMembers(client: DbClient, groupId: string) {
  const { data, error } = await client
    .from("group_members")
    .select("*, profile:profiles(*)")
    .eq("group_id", groupId);
  if (error) throw error;
  return data || [];
}

export async function getGroupMember(client: DbClient, groupId: string, userId: string) {
  const { data, error } = await client
    .from("group_members")
    .select("*")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getGroupIdsForUser(client: DbClient, userId: string): Promise<string[]> {
  const { data, error } = await client
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data || []).map((r: any) => r.group_id);
}
