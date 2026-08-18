type EventLifecycleLike = {
  status?: string | null;
  event_date?: string | null;
  prelims_start_at?: string | null;
};

type FightResultLike = {
  result_confirmed?: boolean | null;
};

export const EVENT_AUTO_END_HOURS_AFTER_MAIN_CARD = 8;

export function shouldAutoEndEvent(event: EventLifecycleLike, now = new Date()) {
  if (!event.event_date || !["upcoming", "live"].includes(event.status || "")) {
    return false;
  }

  const mainCardStartsAt = new Date(event.event_date).getTime();
  if (!Number.isFinite(mainCardStartsAt)) return false;

  const automaticEndAt =
    mainCardStartsAt + EVENT_AUTO_END_HOURS_AFTER_MAIN_CARD * 60 * 60_000;
  return automaticEndAt <= now.getTime();
}

export function shouldPromoteEventToLive(event: EventLifecycleLike, now = new Date()) {
  const startsAt = event.prelims_start_at || event.event_date;
  if (event.status !== "upcoming" || !startsAt) return false;
  const eventTime = new Date(startsAt).getTime();
  return Number.isFinite(eventTime) && eventTime <= now.getTime();
}

export function shouldCompleteEvent(fights: FightResultLike[]) {
  return fights.length > 0 && fights.every((fight) => fight.result_confirmed === true);
}

export function getSafeSyncedEventStatus(
  upstreamStatus?: string | null,
  currentStatus?: string | null,
): "upcoming" | "live" | "completed" {
  if (currentStatus === "completed") return "completed";
  if (upstreamStatus === "completed") return "live";
  return upstreamStatus === "live" ? "live" : "upcoming";
}

export function getNextPicksOpenAt(completedAt = new Date()) {
  return new Date(
    Date.UTC(
      completedAt.getUTCFullYear(),
      completedAt.getUTCMonth(),
      completedAt.getUTCDate() + 1,
      15,
    ),
  ).toISOString();
}
