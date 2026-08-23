import type { DbClient } from "@/types/database";

export async function listEventFights(client: DbClient, eventId: string) {
  const { data, error } = await client
    .from("fights")
    .select(
      "id, card_type, fight_order, weight_class, is_title_fight, total_rounds, result_confirmed, odds_a, odds_b, ufc_matchup_url, fighter_a:fighters!fighter_a_id(id,name), fighter_b:fighters!fighter_b_id(id,name)",
    )
    .eq("event_id", eventId)
    .order("card_type")
    .order("fight_order");

  if (error) throw error;
  return data || [];
}

export async function listPendingFights(client: any) {
  const { data, error } = await client
    .from("fights")
    .select(
      "id, event_id, odds_a, odds_b, ufc_matchup_url, fighter_a:fighters!fighter_a_id(name), fighter_b:fighters!fighter_b_id(name), event:events!inner(id, name, status, event_date, picks_open_at, picks_lock_at, ufc_stats_url, banner_image_url)",
    )
    .order("event_id");

  if (error) throw error;
  return data || [];
}

export async function updateFight(
  client: DbClient,
  fightId: string,
  payload: Record<string, unknown>,
) {
  const { data, error } = await client
    .from("fights")
    .update(payload)
    .eq("id", fightId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFight(client: any, fightId: string) {
  const { error } = await client.from("fights").delete().eq("id", fightId);
  if (error) throw error;
}

export async function findFightById(client: any, fightId: string) {
  const { data, error } = await client
    .from("fights")
    .select(
      "id, event_id, fighter_a_id, fighter_b_id, total_rounds, fighter_a:fighters!fights_fighter_a_id_fkey(id,name), fighter_b:fighters!fights_fighter_b_id_fkey(id,name), event:events(id,name,slug,picks_open_at,picks_lock_at)",
    )
    .eq("id", fightId)
    .single();

  if (error) throw error;
  return data;
}

export async function findFighterByName(client: any, name: string) {
  const { data, error } = await client
    .from("fighters")
    .select("id")
    .eq("name", name)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createFighter(client: any, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from("fighters")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function updateFighter(
  client: DbClient,
  fighterId: string,
  payload: Record<string, unknown>,
) {
  const { data, error } = await client
    .from("fighters")
    .update(payload)
    .eq("id", fighterId)
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function createFight(client: any, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from("fights")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listAllFighters(client: any) {
  const { data, error } = await client
    .from("fighters")
    .select("id, name, country, ufc_fighter_id")
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function listActivityLogs(client: any, limit = 200, action?: string) {
  let query = client
    .from("activity_logs")
    .select("id, user_id, action, details, suspicious, created_at");

  if (action) {
    query = query.eq("action", action);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
