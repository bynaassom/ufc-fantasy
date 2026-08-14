import { groupAdminEvents } from "@/lib/admin-event-groups";

describe("groupAdminEvents", () => {
  it("groups current and future events before previous events by year and month", () => {
    const groups = groupAdminEvents(
      [
        {
          id: "future-later",
          name: "Future Later",
          status: "upcoming",
          event_date: "2026-07-10T22:00:00.000Z",
        },
        {
          id: "previous-april",
          name: "Previous April",
          status: "completed",
          event_date: "2026-04-20T22:00:00.000Z",
        },
        {
          id: "future-next",
          name: "Future Next",
          status: "upcoming",
          event_date: "2026-06-07T22:00:00.000Z",
        },
        {
          id: "previous-may-older",
          name: "Previous May Older",
          status: "completed",
          event_date: "2026-05-10T22:00:00.000Z",
        },
        {
          id: "previous-may-newer",
          name: "Previous May Newer",
          status: "completed",
          event_date: "2026-05-30T22:00:00.000Z",
        },
      ],
      new Date("2026-06-03T12:00:00.000Z"),
    );

    expect(groups.map((group) => group.label)).toEqual([
      "Atual e próximos",
      "Anteriores · 2026 · Maio",
      "Anteriores · 2026 · Abril",
    ]);
    expect(groups[0].events.map((event) => event.id)).toEqual([
      "future-next",
      "future-later",
    ]);
    expect(groups[1].events.map((event) => event.id)).toEqual([
      "previous-may-newer",
      "previous-may-older",
    ]);
  });

  it("keeps a live event current during the safe event window", () => {
    const groups = groupAdminEvents(
      [
        {
          id: "live",
          name: "Live Event",
          status: "live",
          event_date: "2026-06-03T08:00:00.000Z",
        },
      ],
      new Date("2026-06-03T12:00:00.000Z"),
    );

    expect(groups[0]).toMatchObject({
      label: "Atual e próximos",
      events: [{ id: "live" }],
    });
  });

  it("moves stale live and upcoming events to previous groups", () => {
    const groups = groupAdminEvents(
      [
        {
          id: "stale-live",
          name: "Stale Live",
          status: "live",
          event_date: "2026-06-02T22:00:00.000Z",
        },
        {
          id: "stale-upcoming",
          name: "Stale Upcoming",
          status: "upcoming",
          event_date: "2026-06-02T20:00:00.000Z",
        },
      ],
      new Date("2026-06-03T12:00:00.000Z"),
    );

    expect(groups[0]).toMatchObject({
      label: "Anteriores · 2026 · Junho",
    });
    expect(groups[0].events.map((event) => event.id)).toEqual([
      "stale-live",
      "stale-upcoming",
    ]);
  });
});
