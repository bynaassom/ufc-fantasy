import {
  buildResultPollingSchedule,
  buildResultStarterSchedule,
} from "@/server/services/cron-job-org";

describe("cron-job.org result schedules", () => {
  const event = {
    id: "event-1",
    prelims_start_at: "2026-08-23T20:13:00.000Z",
    event_date: "2026-08-23T23:00:00.000Z",
  };

  it("creates a one-shot UTC starter at the prelims time", () => {
    expect(buildResultStarterSchedule(event)).toEqual({
      timezone: "UTC",
      expiresAt: 20260823202300,
      hours: [20],
      mdays: [23],
      minutes: [13],
      months: [8],
      wdays: [-1],
    });
  });

  it("creates an every-two-minutes poller with a 12 hour expiry", () => {
    const schedule = buildResultPollingSchedule(event)!;
    expect(schedule.expiresAt).toBe(20260824081300);
    expect(schedule.minutes).toHaveLength(30);
    expect(schedule.minutes.slice(0, 4)).toEqual([0, 2, 4, 6]);
    expect(schedule.minutes.at(-1)).toBe(58);
  });
});
