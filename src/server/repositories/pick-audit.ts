import type { DbClient } from "@/types/database";

export type PickSaveAttemptInput = {
  request_id: string;
  client_request_id?: string;
  user_id: string;
  event_id: string;
  event_slug: string;
  source: string;
  pick_count: number;
  client_saved_at?: string;
  user_agent?: string;
};

export async function createPickSaveAttempt(
  client: DbClient,
  payload: PickSaveAttemptInput,
) {
  const { data, error } = await client
    .from("pick_save_attempts")
    .insert(payload)
    .select("id, request_id, received_at")
    .single();

  if (error) throw error;
  return data;
}

export async function updatePickSaveAttempt(
  client: DbClient,
  requestId: string,
  payload: Record<string, unknown>,
) {
  const { error } = await client
    .from("pick_save_attempts")
    .update(payload)
    .eq("request_id", requestId);

  if (error) throw error;
}

export async function getPickAuditRows(
  client: DbClient,
  userId: string,
  eventId: string,
) {
  const [profileResult, eventResult, fightsResult, picksResult, attemptsResult, versionsResult] =
    await Promise.all([
      client
        .from("profiles")
        .select("id, nickname, first_name, last_name")
        .eq("id", userId)
        .maybeSingle(),
      client
        .from("events")
        .select("id, name, slug, status, event_date, picks_lock_at")
        .eq("id", eventId)
        .maybeSingle(),
      client
        .from("fights")
        .select(`
          id,
          fighter_a_id,
          fighter_b_id,
          fight_order,
          card_type,
          weight_class,
          fighter_a:fighters!fights_fighter_a_id_fkey(id, name),
          fighter_b:fighters!fights_fighter_b_id_fkey(id, name)
        `)
        .eq("event_id", eventId)
        .order("fight_order", { ascending: true }),
      client
        .from("picks")
        .select(`
          id,
          fight_id,
          picked_winner_id,
          picked_method,
          picked_round,
          client_selected_at,
          is_confirmed,
          confirmed_at,
          created_at,
          updated_at,
          last_save_request_id,
          last_save_source
        `)
        .eq("user_id", userId)
        .eq("event_id", eventId),
      client
        .from("pick_save_attempts")
        .select(`
          id,
          request_id,
          client_request_id,
          status,
          source,
          pick_count,
          received_at,
          completed_at,
          client_saved_at,
          error_code,
          error_message,
          user_agent
        `)
        .eq("user_id", userId)
        .eq("event_id", eventId)
        .order("received_at", { ascending: false })
        .limit(250),
      client
        .from("pick_versions")
        .select(`
          id,
          pick_id,
          fight_id,
          operation,
          before_data,
          after_data,
          changed_fields,
          request_id,
          source,
          occurred_at
        `)
        .eq("user_id", userId)
        .eq("event_id", eventId)
        .order("occurred_at", { ascending: false })
        .limit(500),
    ]);

  const results = [
    profileResult,
    eventResult,
    fightsResult,
    picksResult,
    attemptsResult,
    versionsResult,
  ];
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;

  return {
    profile: profileResult.data,
    event: eventResult.data,
    fights: fightsResult.data || [],
    picks: picksResult.data || [],
    attempts: attemptsResult.data || [],
    versions: versionsResult.data || [],
  };
}
