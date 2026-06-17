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

  it("opens picks 6 days before the next event at 15h UTC", () => {
    // Event on June 12 at 22:00 UTC → picks open on June 6 at 15:00 UTC
    expect(getNextPicksOpenAt("2026-06-12T22:00:00.000Z")).toBe(
      "2026-06-06T15:00:00.000Z",
    );
    // Event on Jan 1 at 00:00 UTC → picks open on Dec 26 at 15:00 UTC
    expect(getNextPicksOpenAt("2027-01-01T00:00:00.000Z")).toBe(
      "2026-12-26T15:00:00.000Z",
    );
  });
});
