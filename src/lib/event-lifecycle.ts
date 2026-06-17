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

export function getNextPicksOpenAt(nextEventDate: string) {
  const eventDate = new Date(nextEventDate);
  return new Date(
    Date.UTC(
      eventDate.getUTCFullYear(),
      eventDate.getUTCMonth(),
      eventDate.getUTCDate() - 6,
      15,
    ),
  ).toISOString();
}
