import {
  buildNotificationContent,
  buildNotificationDedupeKey,
  filterUsersWithoutConfirmedPicks,
  getDuePickReminderTypes,
} from "@/lib/notifications";

describe("notifications", () => {
  const event = {
    id: "event-1",
    name: "UFC Fortaleza",
    slug: "ufc-fortaleza",
    picks_open_at: "2026-05-01T18:00:00.000Z",
    picks_lock_at: "2026-05-02T21:00:00.000Z",
  };

  it("returns only the active reminder window for pick close alerts", () => {
    expect(
      getDuePickReminderTypes({
        now: new Date("2026-05-01T15:00:00.000Z"),
        event: {
          ...event,
          picks_open_at: "2026-04-30T18:00:00.000Z",
        },
      }),
    ).toEqual(["picks_closing_tomorrow"]);

    expect(
      getDuePickReminderTypes({
        now: new Date("2026-05-02T15:00:00.000Z"),
        event,
      }),
    ).toEqual(["picks_closing_today"]);

    expect(
      getDuePickReminderTypes({
        now: new Date("2026-05-02T20:02:00.000Z"),
        event,
      }),
    ).toEqual(["picks_closing_1h"]);

    expect(
      getDuePickReminderTypes({
        now: new Date("2026-05-02T20:32:00.000Z"),
        event,
      }),
    ).toEqual(["picks_closing_30m"]);

    expect(
      getDuePickReminderTypes({
        now: new Date("2026-05-02T20:46:00.000Z"),
        event,
      }),
    ).toEqual(["picks_closing_15m"]);
  });

  it("does not send stale minute reminders after their five-minute cron window has passed", () => {
    expect(
      getDuePickReminderTypes({
        now: new Date("2026-05-02T20:08:00.000Z"),
        event,
      }),
    ).toEqual([]);

    expect(
      getDuePickReminderTypes({
        now: new Date("2026-05-02T20:38:00.000Z"),
        event,
      }),
    ).toEqual([]);

    expect(
      getDuePickReminderTypes({
        now: new Date("2026-05-02T20:50:00.000Z"),
        event,
      }),
    ).toEqual([]);
  });

  it("only sends calendar day reminders near noon in Brasilia time", () => {
    const earlyOpenEvent = {
      ...event,
      picks_open_at: "2026-04-30T18:00:00.000Z",
    };

    expect(
      getDuePickReminderTypes({
        now: new Date("2026-05-01T03:00:00.000Z"),
        event: earlyOpenEvent,
      }),
    ).toEqual([]);

    expect(
      getDuePickReminderTypes({
        now: new Date("2026-05-01T15:04:59.000Z"),
        event: earlyOpenEvent,
      }),
    ).toEqual(["picks_closing_tomorrow"]);

    expect(
      getDuePickReminderTypes({
        now: new Date("2026-05-01T15:05:00.000Z"),
        event: earlyOpenEvent,
      }),
    ).toEqual([]);

    expect(
      getDuePickReminderTypes({
        now: new Date("2026-05-02T03:00:00.000Z"),
        event,
      }),
    ).toEqual([]);
  });

  it("does not return close reminders before picks open or after they lock", () => {
    expect(
      getDuePickReminderTypes({
        now: new Date("2026-05-01T17:00:00.000Z"),
        event,
      }),
    ).toEqual([]);

    expect(
      getDuePickReminderTypes({
        now: new Date("2026-05-02T21:01:00.000Z"),
        event,
      }),
    ).toEqual([]);
  });

  it("does not stack calendar reminders during the first hour after picks open", () => {
    expect(
      getDuePickReminderTypes({
        now: new Date("2026-05-01T18:30:00.000Z"),
        event,
      }),
    ).toEqual([]);
  });

  it("builds playful notification copy with event and fight context", () => {
    expect(
      buildNotificationContent({
        type: "picks_closing_15m",
        eventName: "UFC Fortaleza",
      }),
    ).toMatchObject({
      title: "So 15 minutos",
      message: "E ai, ja fez seus picks? Faltam so 15 minutos pra fechar, hein.",
    });

    expect(
      buildNotificationContent({
        type: "fight_removed",
        eventName: "UFC Fortaleza",
        fightName: "Lutador A vs Lutador B",
      }),
    ).toMatchObject({
      title: "Ih, deu ruim",
        message: "A luta Lutador A vs Lutador B caiu do card do UFC Fortaleza.",
      });
  });

  it("builds celebratory copy for a perfect pick", () => {
    expect(
      buildNotificationContent({
        type: "perfect_pick",
        eventName: "UFC Fortaleza",
        fightName: "Lutador A vs Lutador B",
      }),
    ).toMatchObject({
      title: "Cravada!",
      message:
        "Voce cravou Lutador A vs Lutador B no UFC Fortaleza: vencedor, metodo e round. Ai sim!",
    });
  });

  it("filters active users that do not have confirmed picks for the event", () => {
    const recipients = filterUsersWithoutConfirmedPicks({
      profiles: [
        { id: "user-1", is_banned: false },
        { id: "user-2", is_banned: false },
        { id: "user-3", is_banned: true },
      ],
      picks: [
        { user_id: "user-1", event_id: "event-1", is_confirmed: true },
        { user_id: "user-2", event_id: "other-event", is_confirmed: true },
      ],
      eventId: "event-1",
    });

    expect(recipients).toEqual(["user-2"]);
  });

  it("builds stable dedupe keys per notification target", () => {
    expect(
      buildNotificationDedupeKey({
        type: "fight_added",
        eventId: "event-1",
        fightId: "fight-1",
      }),
    ).toBe("fight_added:event-1:fight-1");

    expect(
      buildNotificationDedupeKey({
        type: "picks_closing_today",
        eventId: "event-1",
      }),
    ).toBe("picks_closing_today:event-1");
  });
});
