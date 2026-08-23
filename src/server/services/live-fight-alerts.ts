import type { FightWithFighters } from "@/types";
import type { DbClient } from "@/types/database";
import type { UfcLiveEvent } from "@/lib/ufc-live-api";
import { listFightAlertRecipientIds } from "@/server/repositories/fight-alerts";
import {
  createNotificationsForUsers,
  emptyNotificationBatchResult,
  type NotificationBatchResult,
} from "@/server/services/notifications";
import { buildOfficialLiveState } from "@/server/services/official-live-state";

export type LiveFightAlertDeps = {
  listRecipientIds: typeof listFightAlertRecipientIds;
  createNotifications: typeof createNotificationsForUsers;
};

const defaultDeps: LiveFightAlertDeps = {
  listRecipientIds: listFightAlertRecipientIds,
  createNotifications: createNotificationsForUsers,
};

function addResults(
  left: NotificationBatchResult,
  right: NotificationBatchResult,
): NotificationBatchResult {
  return {
    created: left.created + right.created,
    pushSent: left.pushSent + right.pushSent,
    pushFailed: left.pushFailed + right.pushFailed,
    pushRemoved: left.pushRemoved + right.pushRemoved,
  };
}

function fightName(fight: { fighterA: { name: string }; fighterB: { name: string } }) {
  return `${fight.fighterA.name} vs ${fight.fighterB.name}`;
}

export async function dispatchLiveFightAlerts(
  client: DbClient,
  event: {
    id: string;
    name: string;
    slug: string;
    fights: Array<Pick<FightWithFighters, "id" | "fighter_a" | "fighter_b">>;
  },
  official: UfcLiveEvent,
  deps: LiveFightAlertDeps = defaultDeps,
) {
  const state = buildOfficialLiveState(official, event.fights);
  let result: NotificationBatchResult = { ...emptyNotificationBatchResult };

  const shouldAnnounceNext =
    !state.currentFight || state.currentFight.phase === "awaiting_result";

  if (shouldAnnounceNext && state.nextFight?.localFightId) {
    const userIds = await deps.listRecipientIds(
      client,
      event.id,
      state.nextFight.localFightId,
    );
    result = addResults(
      result,
      await deps.createNotifications(client, {
        userIds,
        type: "fight_up_next",
        event,
        fightId: state.nextFight.localFightId,
        fightName: fightName(state.nextFight),
        targetPath: `/event/${event.slug}#fight-${state.nextFight.localFightId}`,
      }),
    );
  }

  if (
    state.currentFight?.localFightId &&
    ["walkouts", "introductions", "live"].includes(state.currentFight.phase)
  ) {
    const userIds = await deps.listRecipientIds(
      client,
      event.id,
      state.currentFight.localFightId,
    );
    result = addResults(
      result,
      await deps.createNotifications(client, {
        userIds,
        type: "fight_starting",
        event,
        fightId: state.currentFight.localFightId,
        fightName: fightName(state.currentFight),
        targetPath: `/event/${event.slug}#fight-${state.currentFight.localFightId}`,
      }),
    );
  }

  return { ...result, state };
}
