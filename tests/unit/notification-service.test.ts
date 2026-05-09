import {
  createNotificationsForUsers,
  dispatchDuePickNotifications,
  type NotificationServiceDeps,
} from "@/server/services/notifications";

function createDeps(overrides: Partial<NotificationServiceDeps> = {}) {
  const created: any[] = [];

  return {
    created,
    deps: {
      createNotificationOnce: vi.fn(async (_client, payload) => {
        created.push(payload);
        return {
          id: `notification-${created.length}`,
          ...payload,
          created_at: "2026-05-02T20:45:00.000Z",
        };
      }),
      listPushSubscriptionsForUsers: vi.fn(async () => []),
      deletePushSubscriptionByEndpoint: vi.fn(async () => undefined),
      sendPush: vi.fn(async () => ({ ok: false, removeSubscription: false })),
      getCurrentEvent: vi.fn(async () => null),
      listActiveRecipients: vi.fn(async () => []),
      listConfirmedPickUsersForEvent: vi.fn(async () => []),
      ...overrides,
    } satisfies NotificationServiceDeps,
  };
}

describe("notification service", () => {
  it("dispatches closed picks notifications to active users when picks lock", async () => {
    const { created, deps } = createDeps({
      getCurrentEvent: vi.fn(async () => ({
        id: "event-1",
        name: "UFC Fortaleza",
        slug: "ufc-fortaleza",
        status: "upcoming",
        picks_open_at: "2026-05-02T18:00:00.000Z",
        picks_lock_at: "2026-05-02T21:00:00.000Z",
      })),
      listActiveRecipients: vi.fn(async () => [
        { id: "user-1", is_banned: false },
        { id: "user-2", is_banned: false },
      ]),
    });

    const result = await dispatchDuePickNotifications(
      {},
      { now: new Date("2026-05-02T21:00:00.000Z") },
      deps,
    );

    expect(result.created).toBe(2);
    expect(created).toHaveLength(2);
    expect(created.map((entry) => entry.user_id)).toEqual(["user-1", "user-2"]);
    expect(created[0]).toMatchObject({
      event_id: "event-1",
      type: "picks_closed",
      dedupe_key: "picks_closed:event-1",
      target_path: "/event/ufc-fortaleza",
      message: "Acabou o tempo! Os picks do UFC Fortaleza fecharam.",
    });
    expect(deps.listConfirmedPickUsersForEvent).not.toHaveBeenCalled();
  });

  it("dispatches closing reminders only to active users without confirmed picks", async () => {
    const { created, deps } = createDeps({
      getCurrentEvent: vi.fn(async () => ({
        id: "event-1",
        name: "UFC Fortaleza",
        slug: "ufc-fortaleza",
        status: "upcoming",
        picks_open_at: "2026-05-02T18:00:00.000Z",
        picks_lock_at: "2026-05-02T21:00:00.000Z",
      })),
      listActiveRecipients: vi.fn(async () => [
        { id: "user-1", is_banned: false },
        { id: "user-2", is_banned: false },
      ]),
      listConfirmedPickUsersForEvent: vi.fn(async () => [
        { user_id: "user-1", event_id: "event-1", is_confirmed: true },
      ]),
    });

    const result = await dispatchDuePickNotifications(
      {},
      { now: new Date("2026-05-02T20:46:00.000Z") },
      deps,
    );

    expect(result.created).toBe(1);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      user_id: "user-2",
      event_id: "event-1",
      type: "picks_closing_15m",
      dedupe_key: "picks_closing_15m:event-1",
      target_path: "/event/ufc-fortaleza",
    });
  });

  it("removes invalid push subscriptions without skipping in-app notifications", async () => {
    const { created, deps } = createDeps({
      listPushSubscriptionsForUsers: vi.fn(async () => [
        {
          user_id: "user-1",
          endpoint: "https://push.example.invalid/stale",
          p256dh: "p256dh",
          auth: "auth",
        },
      ]),
      sendPush: vi.fn(async () => ({ ok: false, removeSubscription: true })),
    });

    const result = await createNotificationsForUsers(
      {},
      {
        userIds: ["user-1"],
        type: "card_updated",
        event: {
          id: "event-1",
          name: "UFC Fortaleza",
          slug: "ufc-fortaleza",
        },
      },
      deps,
    );

    expect(result.created).toBe(1);
    expect(result.pushRemoved).toBe(1);
    expect(created).toHaveLength(1);
    expect(deps.deletePushSubscriptionByEndpoint).toHaveBeenCalledWith(
      {},
      "https://push.example.invalid/stale",
    );
  });
});
