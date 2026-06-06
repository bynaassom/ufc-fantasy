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
});
