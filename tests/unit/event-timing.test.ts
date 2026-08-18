import { getAutomatedEventTiming } from "@/lib/event-timing";
import {
  applyOfficialUfcEventMetadata,
  extractUfcEventBannerUrl,
  parseUpcomingEventsFromHtml,
  resolveSyncedEventBannerUrl,
} from "@/lib/ufc-api";

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

  it("lets the official live API override the main-card date", () => {
    const event = applyOfficialUfcEventMetadata(
      {
        id: "/event/ufc-330",
        name: "UFC 330",
        date: "2026-08-16T01:00:00.000Z",
        location: "",
        cards: [],
      },
      {
        eventId: "1317",
        name: "UFC 330: Makhachev vs. Machado Garry",
        startTime: "2026-08-15T21:30:00.000Z",
        timeZone: "GMT-04:00",
        prelimsStartAt: "2026-08-15T21:30:00.000Z",
        status: "upcoming",
        location: "Philadelphia, Pennsylvania, USA",
        fights: [],
        results: [],
      },
    );

    expect(event).toMatchObject({
      date: "2026-08-15T21:30:00.000Z",
      prelimsStartAt: "2026-08-15T21:30:00.000Z",
      officialApiEventId: "1317",
    });
  });

  it("extracts the highest resolution official event banner from srcset", () => {
    const html = `
      <picture>
        <source srcset="https://ufc.com/images/styles/background_image_xl/s3/event-EVENT-ART.jpg?h=abc&amp;itok=small 1x,
          https://ufc.com/images/styles/background_image_xl_2x/s3/event-EVENT-ART.jpg?h=abc&amp;itok=large 2x">
        <img src="https://ufc.com/images/styles/background_image_sm/s3/event-EVENT-ART.jpg?h=abc&amp;itok=mobile">
      </picture>`;

    expect(extractUfcEventBannerUrl(html)).toBe(
      "https://ufc.com/images/styles/background_image_xl_2x/s3/event-EVENT-ART.jpg?h=abc&itok=large",
    );
  });

  it("fills missing banners, refreshes official ones and preserves manual URLs", () => {
    const official = "https://ufc.com/images/styles/background_image_xl_2x/s3/new-EVENT-ART.jpg";

    expect(resolveSyncedEventBannerUrl(null, official)).toBe(official);
    expect(
      resolveSyncedEventBannerUrl(
        "https://ufc.com/images/styles/background_image_sm/s3/old-EVENT-ART.jpg",
        official,
      ),
    ).toBe(official);
    expect(
      resolveSyncedEventBannerUrl("https://images.example.com/manual.jpg", official),
    ).toBe("https://images.example.com/manual.jpg");
    expect(resolveSyncedEventBannerUrl(official, null)).toBe(official);
  });
});
