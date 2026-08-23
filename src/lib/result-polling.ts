export const RESULT_POLLING_INTERVAL_MINUTES = 2;
export const RESULT_POLLING_SAFETY_HOURS = 12;

type ResultPollingEvent = {
  prelims_start_at?: string | null;
  event_date?: string | null;
  status?: string | null;
};

function timestamp(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function getResultPollingWindow(event: ResultPollingEvent) {
  const startAt = timestamp(event.prelims_start_at) ?? timestamp(event.event_date);
  if (startAt === null) return null;
  return {
    startsAt: new Date(startAt).toISOString(),
    safetyEndsAt: new Date(
      startAt + RESULT_POLLING_SAFETY_HOURS * 60 * 60_000,
    ).toISOString(),
  };
}

export function shouldPollFightResults(
  event: ResultPollingEvent,
  now: Date | number = Date.now(),
) {
  if (event.status === "completed") return false;
  const window = getResultPollingWindow(event);
  if (!window) return false;
  const nowMs = now instanceof Date ? now.getTime() : now;
  return (
    nowMs >= new Date(window.startsAt).getTime() &&
    nowMs <= new Date(window.safetyEndsAt).getTime()
  );
}
