export const PICKS_LOCK_MINUTES_BEFORE_PRELIMS = 30;
export const DEFAULT_PICKS_OPEN_HOURS_BEFORE_PRELIMS = 12;

function toValidDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getEventLiveStartsAt(event: {
  prelims_start_at?: string | null;
  event_date?: string | null;
}) {
  return toValidDate(event.prelims_start_at) || toValidDate(event.event_date);
}

export function getAutomatedEventTiming(event: {
  prelims_start_at?: string | null;
  event_date?: string | null;
}) {
  const startsAt = getEventLiveStartsAt(event);
  if (!startsAt) return null;

  return {
    liveStartsAt: startsAt.toISOString(),
    picksLockAt: new Date(
      startsAt.getTime() - PICKS_LOCK_MINUTES_BEFORE_PRELIMS * 60_000,
    ).toISOString(),
    picksOpenAt: new Date(
      startsAt.getTime() - DEFAULT_PICKS_OPEN_HOURS_BEFORE_PRELIMS * 60 * 60_000,
    ).toISOString(),
  };
}
