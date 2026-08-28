import {
  getLatestRankingMovementEvent,
  resolveRankingEventSelection,
} from "@/lib/ranking-events";

describe("ranking events", () => {
  const currentEvent = {
    id: "current-id",
    name: "UFC Atual",
    slug: "ufc-atual",
    event_date: "2026-05-09T22:00:00.000Z",
    is_bonus: false,
  };
  const completedEvents = Array.from({ length: 9 }, (_, index) => ({
    id: `event-${index + 1}`,
    name: `UFC ${index + 1}`,
    slug: `ufc-${index + 1}`,
    event_date: `2026-04-${String(30 - index).padStart(2, "0")}T22:00:00.000Z`,
    is_bonus: false,
  }));

  it("selects the current event by default and exposes the last seven completed events", () => {
    const selection = resolveRankingEventSelection({
      currentEvent,
      completedEvents,
      selectedSlug: undefined,
      completedLimit: 7,
    });

    expect(selection.selectedEvent?.id).toBe("current-id");
    expect(selection.selectableEvents.map((event) => event.slug)).toEqual([
      "ufc-atual",
      "ufc-1",
      "ufc-2",
      "ufc-3",
      "ufc-4",
      "ufc-5",
      "ufc-6",
      "ufc-7",
    ]);
  });

  it("selects a completed event when its slug is provided", () => {
    const selection = resolveRankingEventSelection({
      currentEvent,
      completedEvents,
      selectedSlug: "ufc-3",
      completedLimit: 7,
    });

    expect(selection.selectedEvent?.id).toBe("event-3");
  });

  it("falls back to the first selectable event when the slug is not available", () => {
    const selection = resolveRankingEventSelection({
      currentEvent,
      completedEvents,
      selectedSlug: "ufc-antigo-demais",
      completedLimit: 7,
    });

    expect(selection.selectedEvent?.id).toBe("current-id");
  });

  it("uses the latest ranked event for cumulative ranking movement", () => {
    const events = [
      { ...completedEvents[0], is_bonus: true },
      completedEvents[1],
    ];

    expect(getLatestRankingMovementEvent(events)?.id).toBe("event-2");
  });
});
