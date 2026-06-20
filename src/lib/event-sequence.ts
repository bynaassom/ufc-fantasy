import type { Event } from "@/types";

type SequenceEvent = Pick<Event, "id" | "status" | "event_date" | "picks_open_at">;

function getTimestamp(now: Date | number) {
  return now instanceof Date ? now.getTime() : now;
}

function getPicksOpenMs(event: SequenceEvent): number | null {
  if (!event.picks_open_at) return null;
  const ms = new Date(event.picks_open_at).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function resolvePublicEventSequence<T extends SequenceEvent>(
  events: Array<T | null | undefined>,
  now: Date | number = Date.now(),
) {
  const nowMs = getTimestamp(now);
  const uniqueEvents = new Map<string, T>();

  for (const event of events) {
    if (!event || (event.status !== "upcoming" && event.status !== "live")) {
      continue;
    }

    const eventTime = new Date(event.event_date).getTime();
    if (!Number.isFinite(eventTime)) {
      continue;
    }

    if (event.status === "upcoming" && eventTime < nowMs) {
      continue;
    }

    uniqueEvents.set(event.id, event);
  }

  const sorted = Array.from(uniqueEvents.values()).sort(
    (left, right) =>
      new Date(left.event_date).getTime() - new Date(right.event_date).getTime(),
  );

  if (sorted.length <= 1) return sorted;

  const nextPicksOpenMs = getPicksOpenMs(sorted[1]);
  if (nextPicksOpenMs !== null) {
    const cutoffMs = nextPicksOpenMs - 60 * 60 * 1000;
    if (nowMs >= cutoffMs) {
      sorted.shift();
    }
  }

  return sorted;
}

export const PUBLIC_EVENT_ACTIVE_WINDOW_MS = 6 * 60 * 60 * 1000;

export function getPublicEventCutoffIso(now: Date | number = Date.now()) {
  return new Date(getTimestamp(now) - PUBLIC_EVENT_ACTIVE_WINDOW_MS).toISOString();
}
