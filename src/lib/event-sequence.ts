import type { Event } from "@/types";

export const PUBLIC_EVENT_ACTIVE_WINDOW_MS = 6 * 60 * 60 * 1000;

type SequenceEvent = Pick<Event, "id" | "status" | "event_date">;

function getTimestamp(now: Date | number) {
  return now instanceof Date ? now.getTime() : now;
}

export function getPublicEventCutoffIso(now: Date | number = Date.now()) {
  return new Date(getTimestamp(now) - PUBLIC_EVENT_ACTIVE_WINDOW_MS).toISOString();
}

export function resolvePublicEventSequence<T extends SequenceEvent>(
  events: Array<T | null | undefined>,
  now: Date | number = Date.now(),
) {
  const cutoff = getTimestamp(now) - PUBLIC_EVENT_ACTIVE_WINDOW_MS;
  const uniqueEvents = new Map<string, T>();

  for (const event of events) {
    if (!event || (event.status !== "upcoming" && event.status !== "live")) {
      continue;
    }

    const eventTime = new Date(event.event_date).getTime();
    if (!Number.isFinite(eventTime) || eventTime < cutoff) {
      continue;
    }

    uniqueEvents.set(event.id, event);
  }

  return Array.from(uniqueEvents.values()).sort(
    (left, right) =>
      new Date(left.event_date).getTime() - new Date(right.event_date).getTime(),
  );
}
