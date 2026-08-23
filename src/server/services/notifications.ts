import webpush from "web-push";
import type { DbClient } from "@/types/database";
import {
  buildNotificationContent,
  buildNotificationDedupeKey,
  filterUsersWithoutConfirmedPicks,
  getDuePickReminderTypes,
  getNotificationPreferenceKey,
  isPicksClosedNotificationDue,
  isPicksOpenedNotificationDue,
  type PerfectPickRarity,
  type UfcNotificationType,
} from "@/lib/notifications";
import { getCurrentPublicEvent } from "@/server/repositories/events";
import {
  createNotificationOnce,
  filterUserIdsByNotificationPreference,
  listActiveNotificationRecipients,
  listConfirmedPickUsersForEvent,
} from "@/server/repositories/notifications";
import {
  createAnonymousNotificationDelivery,
  deleteAnonymousPushSubscriptionByEndpoint,
  deletePushSubscriptionByEndpoint,
  listAnonymousPushSubscriptions,
  listPushSubscriptionsForUsers,
} from "@/server/repositories/push-subscriptions";

export type NotificationEvent = {
  id: string;
  name: string;
  slug: string;
  picks_open_at?: string | null;
  picks_lock_at?: string | null;
};

type PushSubscriptionRow = {
  user_id?: string | null;
  anonymous_id?: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type NotificationPayload = {
  id?: string;
  user_id: string;
  type: UfcNotificationType;
  title: string;
  message: string;
  target_path?: string | null;
  event_id?: string | null;
  fight_id?: string | null;
  dedupe_key?: string | null;
  created_at?: string;
};

type PushSendPayload = {
  title: string;
  body: string;
  targetPath: string;
  tag?: string | null;
  type: UfcNotificationType;
  eventId?: string | null;
  fightId?: string | null;
};

type PushSendResult = {
  ok: boolean;
  removeSubscription: boolean;
};

export type NotificationServiceDeps = {
  createNotificationOnce: (
    client: DbClient,
    payload: Record<string, unknown>,
  ) => Promise<NotificationPayload | null>;
  listPushSubscriptionsForUsers: (
    client: DbClient,
    userIds: string[],
  ) => Promise<PushSubscriptionRow[]>;
  deletePushSubscriptionByEndpoint: (
    client: DbClient,
    endpoint: string,
  ) => Promise<void>;
  sendPush: (
    subscription: PushSubscriptionRow,
    payload: PushSendPayload,
  ) => Promise<PushSendResult>;
  getCurrentEvent: (client: DbClient) => Promise<NotificationEvent | null>;
  listActiveRecipients: (
    client: DbClient,
  ) => Promise<Array<{ id: string; is_banned?: boolean | null }>>;
  listConfirmedPickUsersForEvent: (
    client: DbClient,
    eventId: string,
  ) => Promise<Array<{ user_id: string; event_id: string; is_confirmed?: boolean | null }>>;
  filterUserIdsByPreference: (
    client: DbClient,
    userIds: string[],
    prefKey: string,
  ) => Promise<string[]>;
};

export type NotificationBatchResult = {
  created: number;
  pushSent: number;
  pushFailed: number;
  pushRemoved: number;
};

export const emptyNotificationBatchResult = {
  created: 0,
  pushSent: 0,
  pushFailed: 0,
  pushRemoved: 0,
} satisfies NotificationBatchResult;

function addBatchResults(
  left: NotificationBatchResult,
  right: NotificationBatchResult,
) {
  return {
    created: left.created + right.created,
    pushSent: left.pushSent + right.pushSent,
    pushFailed: left.pushFailed + right.pushFailed,
    pushRemoved: left.pushRemoved + right.pushRemoved,
  };
}

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

export function getBrowserPushPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}

export async function sendBrowserPush(
  subscription: PushSubscriptionRow,
  payload: PushSendPayload,
): Promise<PushSendResult> {
  const vapidConfig = getVapidConfig();
  if (!vapidConfig) {
    return { ok: false, removeSubscription: false };
  }

  webpush.setVapidDetails(
    vapidConfig.subject,
    vapidConfig.publicKey,
    vapidConfig.privateKey,
  );

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
    );

    return { ok: true, removeSubscription: false };
  } catch (error: any) {
    const statusCode = Number(error?.statusCode || 0);
    return {
      ok: false,
      removeSubscription: statusCode === 404 || statusCode === 410,
    };
  }
}

const defaultDeps: NotificationServiceDeps = {
  createNotificationOnce,
  listPushSubscriptionsForUsers,
  deletePushSubscriptionByEndpoint,
  sendPush: sendBrowserPush,
  getCurrentEvent: getCurrentPublicEvent as NotificationServiceDeps["getCurrentEvent"],
  listActiveRecipients: listActiveNotificationRecipients,
  listConfirmedPickUsersForEvent,
  filterUserIdsByPreference: filterUserIdsByNotificationPreference,
};

function eventTargetPath(event: Pick<NotificationEvent, "slug">) {
  return `/event/${event.slug}`;
}

export async function createNotificationsForUsers(
  client: DbClient,
  input: {
    userIds: string[];
    type: UfcNotificationType;
    event: NotificationEvent;
    fightId?: string | null;
    fightName?: string | null;
    fightResult?: string | null;
    perfectPickRarity?: PerfectPickRarity | null;
    targetPath?: string | null;
    dedupeKey?: string | null;
  },
  deps: NotificationServiceDeps = defaultDeps,
): Promise<NotificationBatchResult> {
  const uniqueUserIds = Array.from(new Set(input.userIds)).filter(Boolean);
  if (!uniqueUserIds.length) return { ...emptyNotificationBatchResult };

  const prefKey = getNotificationPreferenceKey(input.type);
  const userIds = prefKey
    ? await deps.filterUserIdsByPreference(client, uniqueUserIds, prefKey)
    : uniqueUserIds;
  if (!userIds.length) return { ...emptyNotificationBatchResult };

  const targetPath = input.targetPath || eventTargetPath(input.event);
  const content = buildNotificationContent({
    type: input.type,
    eventName: input.event.name,
    fightName: input.fightName || undefined,
    fightResult: input.fightResult || undefined,
    perfectPickRarity: input.perfectPickRarity || undefined,
  });
  const dedupeKey =
    input.dedupeKey ||
    buildNotificationDedupeKey({
      type: input.type,
      eventId: input.event.id,
      fightId: input.fightId,
    });

  const createdNotifications: NotificationPayload[] = [];

  for (const userId of userIds) {
    const notification = await deps.createNotificationOnce(client, {
      user_id: userId,
      type: input.type,
      title: content.title,
      message: content.message,
      target_path: targetPath,
      event_id: input.event.id,
      fight_id: input.fightId || null,
      dedupe_key: dedupeKey,
    });

    if (notification) createdNotifications.push(notification);
  }

  if (!createdNotifications.length) {
    return { ...emptyNotificationBatchResult };
  }

  const createdUserIds = createdNotifications.map((notification) => notification.user_id);
  const notificationsByUserId = new Map(
    createdNotifications.map((notification) => [notification.user_id, notification]),
  );
  const subscriptions = await deps.listPushSubscriptionsForUsers(
    client,
    createdUserIds,
  );

  let pushSent = 0;
  let pushFailed = 0;
  let pushRemoved = 0;

  for (const subscription of subscriptions) {
    if (!subscription.user_id) continue;
    const notification = notificationsByUserId.get(subscription.user_id);
    if (!notification) continue;

    const result = await deps.sendPush(subscription, {
      title: notification.title,
      body: notification.message,
      targetPath: notification.target_path || targetPath,
      tag: notification.dedupe_key,
      type: notification.type,
      eventId: notification.event_id,
      fightId: notification.fight_id,
    });

    if (result.ok) {
      pushSent += 1;
    } else {
      pushFailed += 1;
    }

    if (result.removeSubscription) {
      await deps.deletePushSubscriptionByEndpoint(client, subscription.endpoint);
      pushRemoved += 1;
    }
  }

  return {
    created: createdNotifications.length,
    pushSent,
    pushFailed,
    pushRemoved,
  };
}

export type AnonymousNotificationServiceDeps = {
  listPushSubscriptions: typeof listAnonymousPushSubscriptions;
  createDelivery: typeof createAnonymousNotificationDelivery;
  deletePushSubscription: typeof deleteAnonymousPushSubscriptionByEndpoint;
  sendPush: typeof sendBrowserPush;
};

const defaultAnonymousDeps: AnonymousNotificationServiceDeps = {
  listPushSubscriptions: listAnonymousPushSubscriptions,
  createDelivery: createAnonymousNotificationDelivery,
  deletePushSubscription: deleteAnonymousPushSubscriptionByEndpoint,
  sendPush: sendBrowserPush,
};

export async function createNotificationsForAnonymousSubscribers(
  client: DbClient,
  input: {
    anonymousIds: string[];
    type: UfcNotificationType;
    event: NotificationEvent;
    fightId?: string | null;
    fightName?: string | null;
    fightResult?: string | null;
    targetPath?: string | null;
    dedupeKey?: string | null;
  },
  deps: AnonymousNotificationServiceDeps = defaultAnonymousDeps,
): Promise<NotificationBatchResult> {
  const anonymousIds = Array.from(new Set(input.anonymousIds)).filter(Boolean);
  if (!anonymousIds.length) return { ...emptyNotificationBatchResult };

  const subscriptions = await deps.listPushSubscriptions(client, anonymousIds);
  const subscriptionsByIdentity = new Map<string, typeof subscriptions>();
  for (const subscription of subscriptions) {
    if (!subscription.anonymous_id) continue;
    subscriptionsByIdentity.set(subscription.anonymous_id, [
      ...(subscriptionsByIdentity.get(subscription.anonymous_id) || []),
      subscription,
    ]);
  }

  const content = buildNotificationContent({
    type: input.type,
    eventName: input.event.name,
    fightName: input.fightName || undefined,
    fightResult: input.fightResult || undefined,
  });
  const targetPath = input.targetPath || `/companion/${input.event.slug}`;
  const dedupeKey = input.dedupeKey || buildNotificationDedupeKey({
    type: input.type,
    eventId: input.event.id,
    fightId: input.fightId,
  });

  let created = 0;
  let pushSent = 0;
  let pushFailed = 0;
  let pushRemoved = 0;

  for (const anonymousId of anonymousIds) {
    const identitySubscriptions = subscriptionsByIdentity.get(anonymousId) || [];
    if (!identitySubscriptions.length) continue;

    const shouldDeliver = await deps.createDelivery(client, {
      anonymous_id: anonymousId,
      type: input.type,
      event_id: input.event.id,
      fight_id: input.fightId || null,
      dedupe_key: dedupeKey,
    });
    if (!shouldDeliver) continue;
    created += 1;

    for (const subscription of identitySubscriptions) {
      const sendResult = await deps.sendPush(subscription, {
        title: content.title,
        body: content.message,
        targetPath,
        tag: dedupeKey,
        type: input.type,
        eventId: input.event.id,
        fightId: input.fightId || null,
      });
      if (sendResult.ok) pushSent += 1;
      else pushFailed += 1;

      if (sendResult.removeSubscription) {
        await deps.deletePushSubscription(client, subscription.endpoint);
        pushRemoved += 1;
      }
    }
  }

  return { created, pushSent, pushFailed, pushRemoved };
}

export async function dispatchDuePickNotifications(
  client: DbClient,
  options: { now?: Date } = {},
  deps: NotificationServiceDeps = defaultDeps,
) {
  const now = options.now || new Date();
  const event = await deps.getCurrentEvent(client);
  if (!event) return { ...emptyNotificationBatchResult };

  const activeRecipients = await deps.listActiveRecipients(client);
  let result = { ...emptyNotificationBatchResult };

  if (isPicksOpenedNotificationDue({ now, event })) {
    result = addBatchResults(
      result,
      await createNotificationsForUsers(
        client,
        {
          userIds: activeRecipients.map((profile) => profile.id),
          type: "picks_opened",
          event,
        },
        deps,
      ),
    );
  }

  if (isPicksClosedNotificationDue({ now, event })) {
    result = addBatchResults(
      result,
      await createNotificationsForUsers(
        client,
        {
          userIds: activeRecipients.map((profile) => profile.id),
          type: "picks_closed",
          event,
        },
        deps,
      ),
    );
  }

  const reminderTypes = getDuePickReminderTypes({ now, event });
  if (!reminderTypes.length) return result;

  const confirmedPicks = await deps.listConfirmedPickUsersForEvent(client, event.id);
  const pendingUserIds = filterUsersWithoutConfirmedPicks({
    profiles: activeRecipients,
    picks: confirmedPicks,
    eventId: event.id,
  });

  for (const type of reminderTypes) {
    result = addBatchResults(
      result,
      await createNotificationsForUsers(
        client,
        {
          userIds: pendingUserIds,
          type,
          event,
        },
        deps,
      ),
    );
  }

  return result;
}

export async function notifyActiveUsers(
  client: DbClient,
  input: {
    type: UfcNotificationType;
    event: NotificationEvent;
    fightId?: string | null;
    fightName?: string | null;
    fightResult?: string | null;
    perfectPickRarity?: PerfectPickRarity | null;
    dedupeKey?: string | null;
  },
  deps: NotificationServiceDeps = defaultDeps,
) {
  const activeRecipients = await deps.listActiveRecipients(client);
  return createNotificationsForUsers(
    client,
    {
      userIds: activeRecipients.map((profile) => profile.id),
      ...input,
    },
    deps,
  );
}

export async function notifyBulkCardChanges(
  client: DbClient,
  input: {
    event: NotificationEvent;
    changeCount: number;
    batchId: string;
  },
  deps: NotificationServiceDeps = defaultDeps,
) {
  if (input.changeCount <= 0) {
    return { ...emptyNotificationBatchResult };
  }

  const currentEvent = await deps.getCurrentEvent(client);
  if (!currentEvent || currentEvent.id !== input.event.id) {
    return { ...emptyNotificationBatchResult };
  }

  return notifyActiveUsers(
    client,
    {
      type: "card_updated",
      event: input.event,
      dedupeKey: `card_updated:${input.event.id}:bulk:${input.batchId}`,
    },
    deps,
  );
}
