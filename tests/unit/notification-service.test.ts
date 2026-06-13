import {
  createNotificationsForUsers,
  dispatchDuePickNotifications,
  notifyBulkCardChanges,
  type NotificationServiceDeps,
} from "@/server/services/notifications";

const testClient = {} as any;

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
      testClient,
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
      testClient,
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
      testClient,
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
      testClient,
      "https://push.example.invalid/stale",
    );
  });

  it("includes perfect pick rarity in in-app and push notifications", async () => {
    const { created, deps } = createDeps({
      listPushSubscriptionsForUsers: vi.fn(async () => [
        {
          user_id: "user-1",
          endpoint: "https://push.example.invalid/ok",
          p256dh: "p256dh",
          auth: "auth",
        },
      ]),
      sendPush: vi.fn(async () => ({ ok: true, removeSubscription: false })),
    });

    const result = await createNotificationsForUsers(
      testClient,
      {
        userIds: ["user-1"],
        type: "perfect_pick",
        event: {
          id: "event-1",
          name: "UFC Fortaleza",
          slug: "ufc-fortaleza",
        },
        fightId: "fight-1",
        fightName: "Lutador A vs Lutador B",
        perfectPickRarity: {
          perfectPickCount: 1,
          confirmedPickCount: 100,
        },
      },
      deps,
    );

    const expectedMessage =
      "Voce cravou Lutador A vs Lutador B no UFC Fortaleza: vencedor, metodo e round. Ai sim! Apenas 1% dos usuarios acertaram esse palpite.";

    expect(result.created).toBe(1);
    expect(result.pushSent).toBe(1);
    expect(created[0]).toMatchObject({
      user_id: "user-1",
      type: "perfect_pick",
      fight_id: "fight-1",
      message: expectedMessage,
    });
    expect(deps.sendPush).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1" }),
      expect.objectContaining({
        body: expectedMessage,
        type: "perfect_pick",
        fightId: "fight-1",
      }),
    );
  });

  it("sends one generic card notification per user for a bulk update", async () => {
    const { created, deps } = createDeps({
      getCurrentEvent: vi.fn(async () => ({
        id: "event-1",
        name: "UFC Fortaleza",
        slug: "ufc-fortaleza",
      })),
      listActiveRecipients: vi.fn(async () => [
        { id: "user-1", is_banned: false },
        { id: "user-2", is_banned: false },
      ]),
    });

    const result = await notifyBulkCardChanges(
      testClient,
      {
        event: {
          id: "event-1",
          name: "UFC Fortaleza",
          slug: "ufc-fortaleza",
        },
        changeCount: 12,
        batchId: "sync-123",
      },
      deps,
    );

    expect(result.created).toBe(2);
    expect(created).toHaveLength(2);
    expect(created).toEqual([
      expect.objectContaining({
        user_id: "user-1",
        type: "card_updated",
        title: "Atualizacao no evento",
        message: "O card do UFC Fortaleza teve atualizacoes. Confira antes de confirmar seus picks.",
        dedupe_key: "card_updated:event-1:bulk:sync-123",
        fight_id: null,
      }),
      expect.objectContaining({
        user_id: "user-2",
        type: "card_updated",
        dedupe_key: "card_updated:event-1:bulk:sync-123",
        fight_id: null,
      }),
    ]);
  });

  it("does not notify users when a bulk update applies no changes", async () => {
    const { created, deps } = createDeps({
      listActiveRecipients: vi.fn(async () => [{ id: "user-1", is_banned: false }]),
    });

    const result = await notifyBulkCardChanges(
      testClient,
      {
        event: {
          id: "event-1",
          name: "UFC Fortaleza",
          slug: "ufc-fortaleza",
        },
        changeCount: 0,
        batchId: "sync-123",
      },
      deps,
    );

    expect(result.created).toBe(0);
    expect(created).toHaveLength(0);
    expect(deps.listActiveRecipients).not.toHaveBeenCalled();
  });

  it("does not notify users when bulk changes belong to a non-current event", async () => {
    const { created, deps } = createDeps({
      getCurrentEvent: vi.fn(async () => ({
        id: "current-event",
        name: "UFC Atual",
        slug: "ufc-atual",
      })),
      listActiveRecipients: vi.fn(async () => [{ id: "user-1", is_banned: false }]),
    });

    const result = await notifyBulkCardChanges(
      testClient,
      {
        event: {
          id: "future-event",
          name: "UFC Futuro",
          slug: "ufc-futuro",
        },
        changeCount: 4,
        batchId: "sync-123",
      },
      deps,
    );

    expect(result.created).toBe(0);
    expect(created).toHaveLength(0);
    expect(deps.getCurrentEvent).toHaveBeenCalledOnce();
    expect(deps.listActiveRecipients).not.toHaveBeenCalled();
  });
});
