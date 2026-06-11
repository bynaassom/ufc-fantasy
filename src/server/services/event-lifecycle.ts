import type { DbClient } from "@/types/database";
import {
  getNextPicksOpenAt,
  shouldCompleteEvent,
} from "@/lib/event-lifecycle";

export async function promoteDueEventsToLive(client: DbClient, now = new Date()) {
  const { data: existingLive, error: liveError } = await client
    .from("events")
    .select("id")
    .eq("status", "live")
    .limit(1)
    .maybeSingle();
  if (liveError) throw new Error(liveError.message);
  if (existingLive) return [];

  const { data: dueEvents, error } = await client
    .from("events")
    .select("id, name, slug")
    .eq("status", "upcoming")
    .lte("event_date", now.toISOString())
    .order("event_date", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);

  const promoted: Array<{ id: string; name: string; slug: string }> = [];
  for (const event of dueEvents || []) {
    const { data, error: updateError } = await client
      .from("events")
      .update({ status: "live" })
      .eq("id", event.id)
      .eq("status", "upcoming")
      .select("id")
      .maybeSingle();
    if (updateError) throw new Error(updateError.message);
    if (data) promoted.push(event);
  }

  return promoted;
}

export async function completeEventIfAllResultsConfirmed(
  client: DbClient,
  eventId: string,
  completedAt = new Date(),
) {
  const [{ data: event, error: eventError }, { data: fights, error: fightsError }] =
    await Promise.all([
      client
        .from("events")
        .select("id, name, slug, event_date, status")
        .eq("id", eventId)
        .single(),
      client.from("fights").select("result_confirmed").eq("event_id", eventId),
    ]);
  if (eventError) throw new Error(eventError.message);
  if (fightsError) throw new Error(fightsError.message);
  if (!event || event.status === "completed" || !shouldCompleteEvent(fights || [])) {
    return { completed: false, event, nextEvent: null };
  }

  const { data: completedEvent, error: updateError } = await client
    .from("events")
    .update({ status: "completed" })
    .eq("id", eventId)
    .neq("status", "completed")
    .select("id, name, slug, event_date, status")
    .maybeSingle();
  if (updateError) throw new Error(updateError.message);
  if (!completedEvent) return { completed: false, event, nextEvent: null };

  const { data: nextEvent, error: nextEventError } = await client
    .from("events")
    .select("id, name, slug, event_date, picks_lock_at")
    .eq("status", "upcoming")
    .gt("event_date", completedEvent.event_date)
    .order("event_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (nextEventError) throw new Error(nextEventError.message);

  if (nextEvent) {
    const { error: nextUpdateError } = await client
      .from("events")
      .update({ picks_open_at: getNextPicksOpenAt(completedAt) })
      .eq("id", nextEvent.id);
    if (nextUpdateError) throw new Error(nextUpdateError.message);
  }

  return {
    completed: true,
    event: completedEvent,
    nextEvent: nextEvent
      ? { ...nextEvent, picks_open_at: getNextPicksOpenAt(completedAt) }
      : null,
  };
}

export async function dispatchEventLifecycle(client: DbClient, now = new Date()) {
  const promoted = await promoteDueEventsToLive(client, now);
  const { data: liveEvents, error } = await client
    .from("events")
    .select("id")
    .eq("status", "live")
    .order("event_date", { ascending: true });
  if (error) throw new Error(error.message);

  const completed = [];
  for (const event of liveEvents || []) {
    const result = await completeEventIfAllResultsConfirmed(client, event.id, now);
    if (result.completed) completed.push(result);
  }

  return { promoted, completed };
}
