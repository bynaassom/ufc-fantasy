export async function getCurrentPublicEvent(client: any) {
  const { data, error } = await client
    .from("events")
    .select("*")
    .in("status", ["upcoming", "live"])
    .order("event_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listRecentEvents(client: any, limit = 20) {
  const { data, error } = await client
    .from("events")
    .select("*")
    .order("event_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function listUpcomingAndCompletedEvents(client: any, limit = 10) {
  const { data, error } = await client
    .from("events")
    .select("*")
    .order("event_date", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function findEventBySlugWithFights(client: any, slug: string) {
  const { data, error } = await client
    .from("events")
    .select(
      `
      *,
      fights (
        *,
        fighter_a:fighters!fights_fighter_a_id_fkey(*),
        fighter_b:fighters!fights_fighter_b_id_fkey(*),
        winner:fighters!fights_winner_id_fkey(*)
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
    .select("id, name, slug, event_date, location, banner_image_url")
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
  client: any,
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
