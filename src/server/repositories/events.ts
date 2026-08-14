import { getPublicEventCutoffIso } from "@/lib/event-sequence";
import type { DbClient } from "@/types/database";

const EVENT_PUBLIC_FIELDS = `
  id,
  name,
  slug,
  event_date,
  location,
  banner_image_url,
  banner_object_position,
  ufc_event_id,
  status,
  picks_lock_at,
  picks_open_at,
  ufc_stats_url,
  espn_fightcenter_url,
  sherdog_event_url,
  tapology_event_url,
  created_at,
  updated_at
`;

const FIGHTER_CARD_FIELDS = `
  id,
  name,
  headshot_url,
  country
`;

const EVENT_WITH_FIGHTS_FIELDS = `
  ${EVENT_PUBLIC_FIELDS},
  fights (
    id,
    event_id,
    fighter_a_id,
    fighter_b_id,
    card_type,
    fight_order,
    weight_class,
    is_title_fight,
    total_rounds,
    winner_id,
    result_method,
    result_round,
    result_confirmed,
    fighter_a:fighters!fights_fighter_a_id_fkey(${FIGHTER_CARD_FIELDS}),
    fighter_b:fighters!fights_fighter_b_id_fkey(${FIGHTER_CARD_FIELDS})
  )
`;

export async function getCurrentPublicEvent(client: DbClient) {
  const { data, error } = await client
    .from("events")
    .select(EVENT_PUBLIC_FIELDS)
    .in("status", ["upcoming", "live"])
    .gte("event_date", getPublicEventCutoffIso())
    .order("event_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listRecentEvents(client: DbClient, limit = 20) {
  const { data, error } = await client
    .from("events")
    .select(EVENT_PUBLIC_FIELDS)
    .order("event_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function listAdminEvents(client: DbClient) {
  const { data, error } = await client
    .from("events")
    .select(`${EVENT_PUBLIC_FIELDS}, prelims_start_at, timing_mode`)
    .order("event_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listUpcomingEvents(client: DbClient, limit = 10) {
  const { data, error } = await client
    .from("events")
    .select(EVENT_PUBLIC_FIELDS)
    .eq("status", "upcoming")
    .gte("event_date", getPublicEventCutoffIso())
    .order("event_date", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function listRecentCompletedEvents(client: any, limit = 3) {
  const { data, error } = await client
    .from("events")
    .select(EVENT_PUBLIC_FIELDS)
    .eq("status", "completed")
    .order("event_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function findEventBySlugWithFights(client: any, slug: string) {
  const { data, error } = await client
    .from("events")
    .select(EVENT_WITH_FIGHTS_FIELDS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findEventBySlugForPickValidation(client: any, slug: string) {
  const { data, error } = await client
    .from("events")
    .select(
      `
      id,
      picks_lock_at,
      picks_open_at,
      fights (
        id,
        fighter_a_id,
        fighter_b_id,
        total_rounds
      )
    `,
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listCompletedEvents(client: any) {
  const { data, error } = await client
    .from("events")
    .select("id, name, slug, event_date, location, banner_image_url, banner_object_position")
    .eq("status", "completed")
    .order("event_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCurrentEventForRanking(client: any) {
  const { data, error } = await client
    .from("events")
    .select("id, name")
    .in("status", ["upcoming", "live"])
    .gte("event_date", getPublicEventCutoffIso())
    .order("event_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findEventById(client: any, eventId: string) {
  const { data, error } = await client
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error) throw error;
  return data;
}

export async function createEvent(client: any, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from("events")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateEvent(
  client: DbClient,
  eventId: string,
  payload: Record<string, unknown>,
) {
  const { data, error } = await client
    .from("events")
    .update(payload)
    .eq("id", eventId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
