import { getAutomatedEventTiming } from "@/lib/event-timing";
import { parseUpcomingEventsFromHtml } from "@/lib/ufc-api";

describe("event timing automation", () => {
  it("locks picks 30 minutes before the earliest preliminary segment", () => {
    const timing = getAutomatedEventTiming({
      event_date: "2026-08-16T02:00:00.000Z",
      prelims_start_at: "2026-08-15T22:00:00.000Z",
    });

    expect(timing).toMatchObject({
      liveStartsAt: "2026-08-15T22:00:00.000Z",
      picksLockAt: "2026-08-15T21:30:00.000Z",
    });
  });

  it("falls back to the main card time while prelim data is unavailable", () => {
    expect(
      getAutomatedEventTiming({ event_date: "2026-08-16T02:00:00.000Z" }),
    ).toMatchObject({ picksLockAt: "2026-08-16T01:30:00.000Z" });
  });

  it("parses UFC early prelim and prelim timestamps and picks the earliest", () => {
    const html = `
      <section id="events-list-upcoming">
        <article class="c-card-event--result">
          <div class="c-card-event--result__headline"><a href="/event/ufc-test">UFC Test</a></div>
          <div data-main-card-timestamp="1786842000" data-prelims-card-timestamp="1786834800" data-early-card-timestamp="1786829400"></div>
        </article><div class="c-card-event--result__actions"></div>
      </section><section id="events-list-past"></section>`;

    expect(parseUpcomingEventsFromHtml(html)[0]).toMatchObject({
      prelimsStartAt: new Date(1786829400 * 1000).toISOString(),
    });
  });
});
