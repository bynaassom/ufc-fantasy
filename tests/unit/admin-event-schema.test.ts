import { adminEventSchema } from "@/server/validators/admin";

describe("adminEventSchema", () => {
  it("accepts only the official UFC and UFCStats source fields", () => {
    const parsed = adminEventSchema.parse({
      name: "UFC Fight Night: Test vs Test",
      event_date: "2026-06-06T22:00",
      ufc_event_id: "https://www.ufc.com/event/ufc-fight-night-test-vs-test",
      ufc_stats_url: "http://ufcstats.com/event-details/example",
    });

    expect(parsed).toMatchObject({
      ufc_event_id: "https://www.ufc.com/event/ufc-fight-night-test-vs-test",
      ufc_stats_url: "http://ufcstats.com/event-details/example",
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

  it("accepts the bonus event ranking mode", () => {
    const parsed = adminEventSchema.parse({
      name: "Road To UFC 5.3",
      event_date: "2026-08-29T01:00",
      is_bonus: true,
    });

    expect(parsed.is_bonus).toBe(true);
  });
});
