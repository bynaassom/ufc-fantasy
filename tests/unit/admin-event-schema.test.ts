import { adminEventSchema } from "@/server/validators/admin";

describe("adminEventSchema", () => {
  it("accepts result source URLs for fallback and double-checking", () => {
    const parsed = adminEventSchema.parse({
      name: "UFC Fight Night: Test vs Test",
      event_date: "2026-06-06T22:00",
      ufc_event_id: "https://www.ufc.com/event/ufc-fight-night-test-vs-test",
      ufc_stats_url: "http://ufcstats.com/event-details/example",
      espn_fightcenter_url: "https://www.espn.com/mma/fightcenter/_/id/123",
      sherdog_event_url: "https://www.sherdog.com/events/UFC-Test-123",
      tapology_event_url: "https://www.tapology.com/fightcenter/events/123",
    });

    expect(parsed).toMatchObject({
      ufc_event_id: "https://www.ufc.com/event/ufc-fight-night-test-vs-test",
      espn_fightcenter_url: "https://www.espn.com/mma/fightcenter/_/id/123",
      sherdog_event_url: "https://www.sherdog.com/events/UFC-Test-123",
      tapology_event_url: "https://www.tapology.com/fightcenter/events/123",
    });
  });

  it("accepts automatic timing metadata", () => {
    const parsed = adminEventSchema.parse({
      name: "UFC Test",
      event_date: "2026-08-16T02:00",
      prelims_start_at: "2026-08-15T22:00",
      timing_mode: "automatic",
    });

    expect(parsed).toMatchObject({
      prelims_start_at: "2026-08-15T22:00",
      timing_mode: "automatic",
    });
  });
});
