import {
  getNextPicksOpenAt,
  shouldCompleteEvent,
  shouldPromoteEventToLive,
} from "@/lib/event-lifecycle";

describe("event lifecycle", () => {
  it("promotes an upcoming event to live when its start time arrives", () => {
    const event = {
      status: "upcoming",
      event_date: "2026-06-06T22:00:00.000Z",
    };

    expect(
      shouldPromoteEventToLive(event, new Date("2026-06-06T21:59:59.000Z")),
    ).toBe(false);
    expect(
      shouldPromoteEventToLive(event, new Date("2026-06-06T22:00:00.000Z")),
    ).toBe(true);
    expect(
      shouldPromoteEventToLive(
        { ...event, status: "completed" },
        new Date("2026-06-06T23:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("uses the first preliminary card start instead of the main card time", () => {
    const event = {
      status: "upcoming",
      event_date: "2026-06-06T22:00:00.000Z",
      prelims_start_at: "2026-06-06T19:00:00.000Z",
    };

    expect(
      shouldPromoteEventToLive(event, new Date("2026-06-06T18:59:59.000Z")),
    ).toBe(false);
    expect(
      shouldPromoteEventToLive(event, new Date("2026-06-06T19:00:00.000Z")),
    ).toBe(true);
  });

  it("only completes events with at least one fight and every result confirmed", () => {
    expect(shouldCompleteEvent([])).toBe(false);
    expect(shouldCompleteEvent([{ result_confirmed: true }])).toBe(true);
    expect(
      shouldCompleteEvent([
        { result_confirmed: true },
        { result_confirmed: false },
      ]),
    ).toBe(false);
  });

  it("opens picks on the day after completion at 15 UTC", () => {
    expect(getNextPicksOpenAt(new Date("2026-06-07T03:42:00.000Z"))).toBe(
      "2026-06-08T15:00:00.000Z",
    );
    expect(getNextPicksOpenAt(new Date("2026-12-31T23:59:00.000Z"))).toBe(
      "2027-01-01T15:00:00.000Z",
    );
  });
});
