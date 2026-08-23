import type { FightWithFighters } from "@/types";
import type { DbClient } from "@/types/database";
import type { UfcLiveEvent } from "@/lib/ufc-live-api";
import {
  listAnonymousFightAlertRecipientIds,
  listFightAlertRecipientIds,
} from "@/server/repositories/fight-alerts";
import {
  createNotificationsForAnonymousSubscribers,
  createNotificationsForUsers,
  emptyNotificationBatchResult,
  type NotificationBatchResult,
} from "@/server/services/notifications";
import { buildOfficialLiveState } from "@/server/services/official-live-state";

export type LiveFightAlertDeps = {
  listRecipientIds: typeof listFightAlertRecipientIds;
  listAnonymousRecipientIds: typeof listAnonymousFightAlertRecipientIds;
  createNotifications: typeof createNotificationsForUsers;
  createAnonymousNotifications: typeof createNotificationsForAnonymousSubscribers;
};

const defaultDeps: LiveFightAlertDeps = {
  listRecipientIds: listFightAlertRecipientIds,
  listAnonymousRecipientIds: listAnonymousFightAlertRecipientIds,
  createNotifications: createNotificationsForUsers,
  createAnonymousNotifications: createNotificationsForAnonymousSubscribers,
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
  deps: Partial<LiveFightAlertDeps> = {},
) {
  const activeDeps = { ...defaultDeps, ...deps };
  const state = buildOfficialLiveState(official, event.fights);
  let result: NotificationBatchResult = { ...emptyNotificationBatchResult };

  const shouldAnnounceNext =
    !state.currentFight || state.currentFight.phase === "awaiting_result";

  if (shouldAnnounceNext && state.nextFight?.localFightId) {
    const [userIds, anonymousIds] = await Promise.all([
      activeDeps.listRecipientIds(
        client,
        event.id,
        state.nextFight.localFightId,
        "up_next",
      ),
      activeDeps.listAnonymousRecipientIds(
        client,
        event.id,
        state.nextFight.localFightId,
        "up_next",
      ),
    ]);
    result = addResults(
      result,
      await activeDeps.createNotifications(client, {
        userIds,
        type: "fight_up_next",
        event,
        fightId: state.nextFight.localFightId,
        fightName: fightName(state.nextFight),
        targetPath: `/event/${event.slug}#fight-${state.nextFight.localFightId}`,
      }),
    );
    result = addResults(
      result,
      await activeDeps.createAnonymousNotifications(client, {
        anonymousIds,
        type: "fight_up_next",
        event,
        fightId: state.nextFight.localFightId,
        fightName: fightName(state.nextFight),
        targetPath: `/companion/${event.slug}#fight-${state.nextFight.localFightId}`,
      }),
    );
  }

  if (
    state.currentFight?.localFightId &&
    ["walkouts", "introductions", "live"].includes(state.currentFight.phase)
  ) {
    const [userIds, anonymousIds] = await Promise.all([
      activeDeps.listRecipientIds(
        client,
        event.id,
        state.currentFight.localFightId,
        "starting",
      ),
      activeDeps.listAnonymousRecipientIds(
        client,
        event.id,
        state.currentFight.localFightId,
        "starting",
      ),
    ]);
    result = addResults(
      result,
      await activeDeps.createNotifications(client, {
        userIds,
        type: "fight_starting",
        event,
        fightId: state.currentFight.localFightId,
        fightName: fightName(state.currentFight),
        targetPath: `/event/${event.slug}#fight-${state.currentFight.localFightId}`,
      }),
    );
    result = addResults(
      result,
      await activeDeps.createAnonymousNotifications(client, {
        anonymousIds,
        type: "fight_starting",
        event,
        fightId: state.currentFight.localFightId,
        fightName: fightName(state.currentFight),
        targetPath: `/companion/${event.slug}#fight-${state.currentFight.localFightId}`,
      }),
    );
  }

  return { ...result, state };
}

type ResultAlertUpdate = {
  fight_id: string;
  winner_id: string;
  method: "decision" | "submission" | "knockout";
  round: number;
};

type ResultAlertFight = {
  id: string;
  fighter_a?: { id?: string | null; name?: string | null } | null;
  fighter_b?: { id?: string | null; name?: string | null } | null;
};

const RESULT_METHOD_LABELS: Record<ResultAlertUpdate["method"], string> = {
  decision: "decisão",
  submission: "finalização",
  knockout: "nocaute",
};

export async function dispatchFightResultAlerts(
  client: DbClient,
  event: { id: string; name: string; slug: string },
  updates: ResultAlertUpdate[],
  fights: ResultAlertFight[],
  deps: Partial<LiveFightAlertDeps> = {},
) {
  const activeDeps = { ...defaultDeps, ...deps };
  let result: NotificationBatchResult = { ...emptyNotificationBatchResult };

  for (const update of updates) {
    const fight = fights.find((candidate) => candidate.id === update.fight_id);
    if (!fight) continue;

    const fighterA = fight.fighter_a;
    const fighterB = fight.fighter_b;
    const winner = fighterA?.id === update.winner_id ? fighterA : fighterB;
    const winnerName = winner?.name;
    const fighterAName = fighterA?.name;
    const fighterBName = fighterB?.name;
    if (!winnerName || !fighterAName || !fighterBName) continue;

    const [userIds, anonymousIds] = await Promise.all([
      activeDeps.listRecipientIds(
        client,
        event.id,
        update.fight_id,
        "result",
      ),
      activeDeps.listAnonymousRecipientIds(
        client,
        event.id,
        update.fight_id,
        "result",
      ),
    ]);
    result = addResults(
      result,
      await activeDeps.createNotifications(client, {
        userIds,
        type: "fight_result",
        event,
        fightId: update.fight_id,
        fightName: `${fighterAName} vs ${fighterBName}`,
        fightResult: `${winnerName} venceu por ${RESULT_METHOD_LABELS[update.method]} no R${update.round}`,
        targetPath: `/event/${event.slug}#fight-${update.fight_id}`,
      }),
    );
    result = addResults(
      result,
      await activeDeps.createAnonymousNotifications(client, {
        anonymousIds,
        type: "fight_result",
        event,
        fightId: update.fight_id,
        fightName: `${fighterAName} vs ${fighterBName}`,
        fightResult: `${winnerName} venceu por ${RESULT_METHOD_LABELS[update.method]} no R${update.round}`,
        targetPath: `/companion/${event.slug}#fight-${update.fight_id}`,
      }),
    );
  }

  return result;
}
