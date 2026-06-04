type EventLifecycleLike = {
  status?: string | null;
  event_date?: string | null;
};

type FightResultLike = {
  result_confirmed?: boolean | null;
};

export function shouldPromoteEventToLive(event: EventLifecycleLike, now = new Date()) {
  if (event.status !== "upcoming" || !event.event_date) return false;
  const eventTime = new Date(event.event_date).getTime();
  return Number.isFinite(eventTime) && eventTime <= now.getTime();
}

export function shouldCompleteEvent(fights: FightResultLike[]) {
  return fights.length > 0 && fights.every((fight) => fight.result_confirmed === true);
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
