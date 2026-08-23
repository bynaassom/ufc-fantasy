import {
  getResultPollingWindow,
  shouldPollFightResults,
} from "@/lib/result-polling";

describe("result polling window", () => {
  const event = {
    status: "live",
    prelims_start_at: "2026-08-23T20:00:00.000Z",
    event_date: "2026-08-23T23:00:00.000Z",
  };

  it("starts at the prelims and keeps a 12 hour safety window", () => {
    expect(getResultPollingWindow(event)).toEqual({
      startsAt: "2026-08-23T20:00:00.000Z",
      safetyEndsAt: "2026-08-24T08:00:00.000Z",
    });
    expect(shouldPollFightResults(event, new Date("2026-08-23T19:59:59Z"))).toBe(false);
    expect(shouldPollFightResults(event, new Date("2026-08-23T20:00:00Z"))).toBe(true);
    expect(shouldPollFightResults(event, new Date("2026-08-24T08:00:01Z"))).toBe(false);
  });

  it("falls back to the main event time and stops completed events", () => {
    expect(
      shouldPollFightResults(
        { status: "upcoming", event_date: "2026-08-23T23:00:00Z" },
        new Date("2026-08-23T23:00:00Z"),
      ),
    ).toBe(true);
    expect(
      shouldPollFightResults(
        { ...event, status: "completed" },
        new Date("2026-08-23T21:00:00Z"),
      ),
    ).toBe(false);
  });
});
