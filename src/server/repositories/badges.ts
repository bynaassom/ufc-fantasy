import type { Badge, UserBadge } from "@/types";

export async function listBadges(client: any): Promise<Badge[]> {
  const { data, error } = await client
    .from("badges")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data || []) as Badge[];
}

export async function getBadgeById(client: any, id: string): Promise<Badge | null> {
  const { data, error } = await client
    .from("badges")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as Badge | null;
}

export async function listUserBadges(
  client: any,
  userId: string,
): Promise<UserBadge[]> {
  const { data, error } = await client
    .from("user_badges")
    .select("*, badge:badges(*)")
    .eq("user_id", userId);

  if (error) throw error;
  return (data || []) as UserBadge[];
}

export async function awardBadge(
  client: any,
  userId: string,
  badgeId: string,
): Promise<UserBadge | null> {
  const { data, error } = await client
    .from("user_badges")
    .insert({ user_id: userId, badge_id: badgeId })
    .select("*, badge:badges(*)")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }
  return data as UserBadge | null;
}

export async function createBadge(
  client: any,
  badge: {
    name: string;
    slug: string;
    description: string;
    category: string;
    icon_name: string;
    tier: number;
    sort_order: number;
  },
): Promise<Badge> {
  const { data, error } = await client
    .from("badges")
    .insert(badge)
    .select("*")
    .single();

  if (error) throw error;
  return data as Badge;
}

export async function updateBadge(
  client: any,
  id: string,
  updates: Partial<{
    name: string;
    slug: string;
    description: string;
    category: string;
    icon_name: string;
    tier: number;
    sort_order: number;
  }>,
): Promise<Badge | null> {
  const { data, error } = await client
    .from("badges")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data as Badge | null;
}

export async function deleteBadge(
  client: any,
  id: string,
): Promise<void> {
  const { error } = await client
    .from("badges")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
