import { unstable_cache } from "next/cache";
import type {
  Challenge,
  ChallengeFightComparison,
  Event,
  EventWithFights,
  FightWithFighters,
  GroupWithMembers,
  Notification as AppNotification,
  NotificationPreferences,
  Profile,
  PublicProfileStats,
  PublicProfileSummary,
} from "@/types";
import {
  resolveRankingEventSelection,
  type RankingSelectableEvent,
} from "@/lib/ranking-events";
import { getServiceRoleSupabase } from "@/lib/supabase/service-role";
import { ApiRouteError } from "@/server/api";
import { requireActiveUser } from "@/server/auth/guards";
import { CACHE_TAGS } from "@/server/cache-tags";
import {
  createChallenge,
  findActiveChallengeBetweenUsers,
  findChallengeById,
  listChallengesForProfile,
  listChallengesForUser,
  updateChallenge,
} from "@/server/repositories/challenges";
import {
  createEvent,
  findEventById,
  findEventBySlugForPickValidation,
  findEventBySlugWithFights,
  getCurrentPublicEvent,
  listAdminEvents,
  listCompletedEvents,
  listRecentCompletedEvents,
  listUpcomingEvents,
  updateEvent,
} from "@/server/repositories/events";
import {
  getEventRankForUser,
  getEventScoreForUserAndEvent as getEventScoreRowForUserAndEvent,
  listEventLeaderboard,
} from "@/server/repositories/event-scores";
import { resolvePublicEventSequence } from "@/lib/event-sequence";
import {
  createFight,
  createFighter,
  deleteFight,
  findFightById,
  findFighterByName,
  listActivityLogs,
  listAllFighters,
  listEventFights,
  listPendingFights,
  updateFight,
  updateFighter,
} from "@/server/repositories/fights";
import {
  countConfirmedPicksForFight,
  getPickDistributionForEvent,
  listPerfectPickUsersForFight,
  listPicksForUser,
  listPicksForUserEvent,
  listPicksForUsersEvent,
  upsertUserPicks,
} from "@/server/repositories/picks";
import {
  findProfileById,
  findPublicProfileByNickname,
  findPublicProfilesByIds,
  listPublicProfiles,
  listRecentProfiles,
  updateProfile,
  updateProfileBan,
  updateProfileRole,
} from "@/server/repositories/profiles";
import {
  countUnreadNotifications,
  createNotification,
  listActiveNotificationRecipients,
  listNotificationsForUser,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  shouldNotifyUser,
} from "@/server/repositories/notifications";
import {
  countMembersForGroups,
  createGroup,
  addGroupMember,
  removeGroupMember,
  findGroupById,
  findGroupByInviteCode,
  listGroupChampions,
  listGroupsForUser,
  listGroupMembers,
  getGroupMember,
} from "@/server/repositories/groups";
import {
  createNotificationsForUsers,
  notifyActiveUsers,
  sendBrowserPush,
} from "@/server/services/notifications";
import { getNotificationPreferenceKey } from "@/lib/notifications";
import {
  deletePushSubscriptionByEndpoint,
  listPushSubscriptionsForUsers,
} from "@/server/repositories/push-subscriptions";
import {
  getCurrentSeason,
  listGlobalSeasonStandings,
  listGroupSeasonStandings,
} from "@/server/repositories/standings";
import {
  countFightsForEvent,
  getChallengeStatsForEvent,
  getConfirmedPickStats,
  getEventScoreStats,
  getLeagueStats,
} from "@/server/repositories/stats";
import { completeEventIfAllResultsConfirmed } from "@/server/services/event-lifecycle";
import {
  requireAdminPageProfile,
  requirePageUserProfile,
} from "@/server/services/page-auth";
import { listUserBadges } from "@/server/repositories/badges";
import { getRivalry } from "@/server/repositories/rivalries";
import { getAdminSupabase, getUserSupabase } from "@/server/supabase";

type RankingProfileRow = Pick<
  Profile,
  "id" | "nickname" | "first_name" | "last_name" | "total_points"
>;

type EventRankingRow = {
  user_id: string;
  total_points: number;
  perfect_picks: number;
  profile: RankingProfileRow | null;
};

type RankingDisplayEntry = {
  rank: number;
  nickname: string;
  first_name: string;
  last_name: string;
  points: number;
  perfect_picks: number;
  userId: string;
};

type ChallengeRow = Challenge & {
  event?: Event | null;
};

type ChallengeView = Challenge & {
  event: Event;
  challenger: RankingProfileRow | null;
  challenged: RankingProfileRow | null;
  challenger_points: number;
  challenged_points: number;
  leader_user_id: string | null;
  is_expired: boolean;
};

const EVENTS_CACHE_SECONDS = 60;
const EVENT_DETAIL_CACHE_SECONDS = 30;
const RANKING_CACHE_SECONDS = 30;

const getCachedCurrentPublicEvent = unstable_cache(
  async () => {
    const supabase = getServiceRoleSupabase();
    return (await getCurrentPublicEvent(supabase)) as Event | null;
  },
  ["current-public-event"],
  {
    revalidate: EVENTS_CACHE_SECONDS,
    tags: [CACHE_TAGS.events],
  },
);

const getCachedUpcomingEvents = unstable_cache(
  async (limit: number) => {
    const supabase = getServiceRoleSupabase();
    return (await listUpcomingEvents(supabase, limit)) as Event[];
  },
  ["upcoming-events"],
  {
    revalidate: EVENTS_CACHE_SECONDS,
    tags: [CACHE_TAGS.events],
  },
);

const getCachedRecentCompletedEvents = unstable_cache(
  async (limit: number) => {
    const supabase = getServiceRoleSupabase();
    return (await listRecentCompletedEvents(supabase, limit)) as Event[];
  },
  ["recent-completed-events"],
  {
    revalidate: EVENTS_CACHE_SECONDS,
    tags: [CACHE_TAGS.events],
  },
);

const getCachedEventBySlug = unstable_cache(
  async (slug: string) => {
    const supabase = getServiceRoleSupabase();
    return (await findEventBySlugWithFights(supabase, slug)) as EventWithFights | null;
  },
  ["event-by-slug-with-fights"],
  {
    revalidate: EVENT_DETAIL_CACHE_SECONDS,
    tags: [CACHE_TAGS.events],
  },
);

const getCachedGlobalRanking = unstable_cache(
  async () => {
    const supabase = getServiceRoleSupabase();
    return getGlobalRanking(supabase);
  },
  ["global-ranking"],
  {
    revalidate: RANKING_CACHE_SECONDS,
    tags: [CACHE_TAGS.ranking],
  },
);

const getCachedCurrentSeason = unstable_cache(
  async () => {
    const supabase = getServiceRoleSupabase();
    return getCurrentSeason(supabase);
  },
  ["current-season"],
  {
    revalidate: EVENTS_CACHE_SECONDS,
    tags: [CACHE_TAGS.events, CACHE_TAGS.ranking],
  },
);

const getCachedGlobalSeasonStandings = unstable_cache(
  async (seasonId: string) => {
    const supabase = getServiceRoleSupabase();
    return listGlobalSeasonStandings(supabase, seasonId, 100);
  },
  ["global-season-standings"],
  {
    revalidate: RANKING_CACHE_SECONDS,
    tags: [CACHE_TAGS.ranking],
  },
);

const getCachedEventRanking = unstable_cache(
  async (eventId: string) => {
    const supabase = getServiceRoleSupabase();
    const ranking = await getEventRanking(supabase, eventId);
    const userIds = ranking.map((entry: any) => entry.user_id);
    const profiles = await getRankingProfilesByIds(supabase, userIds);
    const profileMap = new Map(
      profiles.map((entry: any) => [entry.id, entry as RankingProfileRow]),
    );

    return ranking
      .map((entry: any) => ({
        ...entry,
        profile: profileMap.get(entry.user_id) || null,
      }))
      .filter((entry: EventRankingRow) => entry.profile) as EventRankingRow[];
  },
  ["event-ranking"],
  {
    revalidate: RANKING_CACHE_SECONDS,
    tags: [CACHE_TAGS.ranking],
  },
);

const getCachedRecentCompletedRankingEvents = unstable_cache(
  async (limit: number) => {
    const supabase = getServiceRoleSupabase();
    const events = await listCompletedEvents(supabase);
    return events.slice(0, limit) as RankingSelectableEvent[];
  },
  ["recent-completed-ranking-events"],
  {
    revalidate: EVENTS_CACHE_SECONDS,
    tags: [CACHE_TAGS.events],
  },
);

const getCachedPublicMomentumStats = unstable_cache(
  async () => {
    const supabase = getServiceRoleSupabase();
    const currentEvent = await getCurrentPublicEvent(supabase);
    const leagues = await getLeagueStats(supabase);

    if (!currentEvent) {
      return {
        currentEvent: null,
        picks: { usersWithConfirmedPicks: 0, confirmedPickRows: 0, fightsOnCard: 0, completionRate: 0 },
        challenges: { pending: 0, accepted: 0, completed: 0, totalActive: 0 },
        leagues,
        scoring: { scoredUsers: 0, averagePoints: 0, bestScore: 0, perfectPicks: 0 },
      };
    }

    const [picks, fightsOnCard, challenges, scoring] = await Promise.all([
      getConfirmedPickStats(supabase, currentEvent.id),
      countFightsForEvent(supabase, currentEvent.id),
      getChallengeStatsForEvent(supabase, currentEvent.id),
      getEventScoreStats(supabase, currentEvent.id),
    ]);

    return {
      currentEvent: {
        id: currentEvent.id,
        name: currentEvent.name,
        slug: currentEvent.slug,
        status: currentEvent.status,
      },
      picks: {
        ...picks,
        fightsOnCard,
        completionRate:
          picks.usersWithConfirmedPicks && fightsOnCard
            ? Math.round((picks.confirmedPickRows / (picks.usersWithConfirmedPicks * fightsOnCard)) * 100)
            : 0,
      },
      challenges,
      leagues,
      scoring,
    };
  },
  ["public-momentum-stats"],
  {
    revalidate: 30,
    tags: [CACHE_TAGS.stats, CACHE_TAGS.events, CACHE_TAGS.ranking],
  },
);

function slugifyEventName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getRelatedFighterName(
  fighter: { name?: string | null } | Array<{ name?: string | null }> | null | undefined,
) {
  return getSingleRelation(fighter)?.name || "";
}

function toNotificationEvent(event: any) {
  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    picks_open_at: event.picks_open_at || null,
    picks_lock_at: event.picks_lock_at || null,
  };
}

function shouldNotifyPicksOpened(event: any) {
  const openAt = event?.picks_open_at ? new Date(event.picks_open_at).getTime() : null;
  const lockAt = event?.picks_lock_at ? new Date(event.picks_lock_at).getTime() : null;
  const now = Date.now();

  return openAt !== null && lockAt !== null && openAt <= now && lockAt > now;
}

async function safelyNotifyActiveUsers(
  client: any,
  input: Parameters<typeof notifyActiveUsers>[1],
) {
  try {
    await notifyActiveUsers(client, input);
  } catch (error) {
    console.error("Failed to create notification", error);
  }
}

async function safelyNotifyUsers(
  client: any,
  input: Parameters<typeof createNotificationsForUsers>[1],
) {
  try {
    await createNotificationsForUsers(client, input);
  } catch (error) {
    console.error("Failed to create notification", error);
  }
}

function hasDatePassed(date: string | null | undefined) {
  if (!date) return false;
  return new Date(date).getTime() <= Date.now();
}

function getChallengeLeaderUserId(
  challengerPoints: number,
  challengedPoints: number,
  challengerId: string,
  challengedId: string,
) {
  if (challengerPoints === challengedPoints) return null;
  return challengerPoints > challengedPoints ? challengerId : challengedId;
}

async function getEventScoresMap(
  client: any,
  userIds: string[],
  eventId: string,
) {
  if (!userIds.length) return new Map<string, number>();

  const { data, error } = await client
    .from("event_scores")
    .select("user_id, total_points")
    .eq("event_id", eventId)
    .in("user_id", userIds);

  if (error) throw error;

  return new Map<string, number>(
    (data || []).map((entry: any) => [
      String(entry.user_id),
      Number(entry.total_points || 0),
    ]),
  );
}

async function createChallengeNotification(
  client: any,
  payload: {
    userId: string;
    type: AppNotification["type"];
    title: string;
    message: string;
    challengeId: string;
    targetPath: string;
  },
) {
  const prefKey = getNotificationPreferenceKey(payload.type as any);
  if (prefKey) {
    const shouldSend = await shouldNotifyUser(client, payload.userId, prefKey);
    if (!shouldSend) return null;
  }

  const notification = await createNotification(client, {
    user_id: payload.userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    challenge_id: payload.challengeId,
    target_path: payload.targetPath,
  });

  try {
    const subscriptions = await listPushSubscriptionsForUsers(client, [payload.userId]);
    for (const sub of subscriptions) {
      const result = await sendBrowserPush(sub, {
        title: payload.title,
        body: payload.message,
        targetPath: payload.targetPath,
        tag: `challenge:${payload.challengeId}`,
        type: payload.type as any,
      });
      if (result.removeSubscription) {
        await deletePushSubscriptionByEndpoint(client, sub.endpoint).catch(() => {});
      }
    }
  } catch (_error) {
    console.error("Failed to send push for challenge notification:", _error);
  }

  return notification;
}

async function resolveChallengeLifecycle(client: any, challenge: ChallengeRow) {
  if (!challenge.event) return challenge;

  if (challenge.status === "pending" && challenge.event.status === "completed") {
    const updated = await updateChallenge(client, challenge.id, {
      status: "expired",
      responded_at: new Date().toISOString(),
    });
    return {
      ...updated,
      event: challenge.event,
    };
  }

  if (challenge.status === "accepted" && challenge.event.status === "completed") {
    const scoreMap = await getEventScoresMap(
      client,
      [challenge.challenger_id, challenge.challenged_id],
      challenge.event_id,
    );
    const challengerPoints = scoreMap.get(challenge.challenger_id) || 0;
    const challengedPoints = scoreMap.get(challenge.challenged_id) || 0;
    const winnerUserId = getChallengeLeaderUserId(
      challengerPoints,
      challengedPoints,
      challenge.challenger_id,
      challenge.challenged_id,
    );

    const updated = await updateChallenge(client, challenge.id, {
      status: "completed",
      winner_user_id: winnerUserId,
      completed_at: new Date().toISOString(),
    });

    const profiles = (await findPublicProfilesByIds(client, [
      challenge.challenger_id,
      challenge.challenged_id,
    ])) as RankingProfileRow[];
    const profileMap = new Map(profiles.map((p) => [String(p.id), p]));
    const challengerName = profileMap.get(challenge.challenger_id)?.nickname || "Desafiante";
    const challengedName = profileMap.get(challenge.challenged_id)?.nickname || "Desafiado";

    if (winnerUserId) {
      const loserUserId = winnerUserId === challenge.challenger_id
        ? challenge.challenged_id
        : challenge.challenger_id;
      const loserName = winnerUserId === challenge.challenger_id ? challengedName : challengerName;
      await createChallengeNotification(client, {
        userId: winnerUserId,
        type: "challenge_result",
        title: "Você venceu o desafio!",
        message: `Parabéns! Você venceu o desafio contra ${loserName}.`,
        challengeId: challenge.id,
        targetPath: `/desafios/${challenge.id}`,
      });
      await createChallengeNotification(client, {
        userId: loserUserId,
        type: "challenge_result",
        title: "Derrota no desafio",
        message: `Você perdeu o desafio para ${profileMap.get(winnerUserId as string)?.nickname || "seu oponente"}.`,
        challengeId: challenge.id,
        targetPath: `/desafios/${challenge.id}`,
      });
    } else {
      await createChallengeNotification(client, {
        userId: challenge.challenger_id,
        type: "challenge_result",
        title: "Desafio empatou!",
        message: `Seu desafio contra ${challengedName} terminou empatado em ${challengerPoints} x ${challengedPoints}.`,
        challengeId: challenge.id,
        targetPath: `/desafios/${challenge.id}`,
      });
      await createChallengeNotification(client, {
        userId: challenge.challenged_id,
        type: "challenge_result",
        title: "Desafio empatou!",
        message: `Seu desafio contra ${challengerName} terminou empatado em ${challengedPoints} x ${challengerPoints}.`,
        challengeId: challenge.id,
        targetPath: `/desafios/${challenge.id}`,
      });
    }

    return {
      ...updated,
      event: challenge.event,
    };
  }

  return challenge;
}

async function enrichChallenges(client: any, challenges: ChallengeRow[]) {
  if (!challenges.length) return [] as ChallengeView[];

  const resolved = (await Promise.all(
    challenges.map((challenge) => resolveChallengeLifecycle(client, challenge)),
  )) as ChallengeRow[];

  const publicProfiles = await findPublicProfilesByIds(
    client,
    Array.from(
      new Set(
        resolved.flatMap((challenge) => [challenge.challenger_id, challenge.challenged_id]),
      ),
    ),
  );

  const profileMap = new Map<string, RankingProfileRow>(
    publicProfiles.map((profile: any) => [
      String(profile.id),
      profile as RankingProfileRow,
    ]),
  );

  const scoreKeys = Array.from(
    new Set(resolved.map((challenge) => challenge.event_id)),
  );
  const scoreMapByChallenge = new Map<
    string,
    { challengerPoints: number; challengedPoints: number; leaderUserId: string | null }
  >();

  if (scoreKeys.length > 0) {
    const allUserIds = Array.from(
      new Set(
        resolved.flatMap((challenge) => [
          challenge.challenger_id,
          challenge.challenged_id,
        ]),
      ),
    );
    const { data: allScores, error: scoresError } = await client
      .from("event_scores")
      .select("user_id, event_id, total_points")
      .in("event_id", scoreKeys)
      .in("user_id", allUserIds);

    if (scoresError) throw scoresError;

    const scoreMap = new Map<string, number>();
    for (const entry of allScores || []) {
      scoreMap.set(`${entry.event_id}:${entry.user_id}`, Number(entry.total_points || 0));
    }

    for (const eventId of scoreKeys) {
      const eventChallenges = resolved.filter((challenge) => challenge.event_id === eventId);
      eventChallenges.forEach((challenge) => {
        const challengerPoints = scoreMap.get(`${eventId}:${challenge.challenger_id}`) || 0;
        const challengedPoints = scoreMap.get(`${eventId}:${challenge.challenged_id}`) || 0;
        scoreMapByChallenge.set(challenge.id, {
          challengerPoints,
          challengedPoints,
          leaderUserId: getChallengeLeaderUserId(
            challengerPoints,
            challengedPoints,
            challenge.challenger_id,
            challenge.challenged_id,
          ),
        });
      });
    }
  }

  return resolved.map((challenge) => {
    const liveScore = scoreMapByChallenge.get(challenge.id) || {
      challengerPoints: 0,
      challengedPoints: 0,
      leaderUserId: null,
    };

    return {
      ...challenge,
      event: challenge.event as Event,
      challenger: profileMap.get(challenge.challenger_id) || null,
      challenged: profileMap.get(challenge.challenged_id) || null,
      challenger_points: liveScore.challengerPoints,
      challenged_points: liveScore.challengedPoints,
      leader_user_id: liveScore.leaderUserId,
      is_expired:
        challenge.status === "expired" ||
        (challenge.status === "pending" &&
          (challenge.event as Event).status === "completed"),
    } satisfies ChallengeView;
  });
}

async function getEventScoresForUser(client: any, userId: string) {
  const { data, error } = await client
    .from("event_scores")
    .select("event_id, total_points, perfect_picks")
    .eq("user_id", userId);

  if (error) throw error;
  return data || [];
}

async function getEventScoreForUserAndEvent(
  client: any,
  userId: string,
  eventId: string,
) {
  const { data, error } = await client
    .from("event_scores")
    .select("total_points, perfect_picks")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getGlobalRanking(client: any) {
  const { data, error } = await client
    .from("ranking_profiles")
    .select("id, nickname, first_name, last_name, total_points")
    .order("total_points", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data || [];
}

async function getEventRanking(client: any, eventId: string) {
  const { data, error } = await client
    .from("event_scores")
    .select("user_id, total_points, perfect_picks")
    .eq("event_id", eventId)
    .order("total_points", { ascending: false })
    .order("perfect_picks", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data || [];
}

async function getRankingProfilesByIds(client: any, userIds: string[]) {
  if (!userIds.length) return [];

  const { data, error } = await client
    .from("ranking_profiles")
    .select("id, nickname, first_name, last_name, total_points")
    .in("id", userIds);

  if (error) throw error;
  return data || [];
}

export async function getLandingPageData() {
  const [currentEvent, momentumStats] = await Promise.all([
    getCachedCurrentPublicEvent(),
    getCachedPublicMomentumStats(),
  ]);
  return { currentEvent, momentumStats };
}

export async function getPublicEventResultShareData(
  eventSlug: string,
  nickname: string,
) {
  const supabase = getServiceRoleSupabase();
  const [event, profile] = await Promise.all([
    findEventBySlugWithFights(supabase, eventSlug) as Promise<EventWithFights | null>,
    findPublicProfileByNickname(supabase, nickname),
  ]);

  if (!event || !profile) return null;

  const picksLocked = hasDatePassed(event.picks_lock_at);
  if (!picksLocked) {
    return {
      status: "not_public_yet" as const,
      event,
      profile,
      picks: [],
      score: null,
      rank: null,
    };
  }

  const [picks, score, rank] = await Promise.all([
    listPicksForUserEvent(supabase, profile.id, event.id),
    getEventScoreRowForUserAndEvent(supabase, profile.id, event.id),
    getEventRankForUser(supabase, profile.id, event.id),
  ]);

  return {
    status: "public" as const,
    event,
    profile,
    picks,
    score,
    rank,
  };
}

export async function getPublicEventPickShareData(
  eventSlug: string,
  nickname: string,
) {
  const supabase = getServiceRoleSupabase();
  const [event, profile] = await Promise.all([
    findEventBySlugWithFights(supabase, eventSlug) as Promise<EventWithFights | null>,
    findPublicProfileByNickname(supabase, nickname),
  ]);

  if (!event || !profile) return null;

  const picksLocked = hasDatePassed(event.picks_lock_at);
  if (!picksLocked) {
    return {
      status: "not_public_yet" as const,
      event,
      profile,
      picks: [],
    };
  }

  const picks = await listPicksForUserEvent(supabase, profile.id, event.id);

  return {
    status: "public" as const,
    event,
    profile,
    picks,
  };
}

export async function getHomePageData() {
  const { profile, user } = await requirePageUserProfile();
  const [cachedCurrentEvent, rawUpcomingEvents, completedEvents] = await Promise.all([
    getCachedCurrentPublicEvent(),
    getCachedUpcomingEvents(10),
    getCachedRecentCompletedEvents(3),
  ]);

  const eventSequence = resolvePublicEventSequence([
    cachedCurrentEvent,
    ...rawUpcomingEvents,
  ]);
  const currentEvent = eventSequence[0] || null;
  const upcomingEvents = eventSequence.filter(
    (event) => event.status === "upcoming" && event.id !== currentEvent?.id,
  );

  const adminSupabase = await getAdminSupabase();
  const rawChallenges = (await listChallengesForUser(adminSupabase, user.id)) as ChallengeRow[];

  const activeChallengeRows = rawChallenges
    .filter(
      (c) =>
        (c.status === "pending" && c.challenged_id === user.id) ||
        c.status === "accepted",
    )
    .slice(0, 5);

  const profileIds = Array.from(
    new Set(activeChallengeRows.flatMap((c) => [c.challenger_id, c.challenged_id])),
  );
  const profiles = await findPublicProfilesByIds(adminSupabase, profileIds);
  const profileMap = new Map(
    profiles.map((p: any) => [String(p.id), p as RankingProfileRow]),
  );

  return {
    profile,
    userId: user.id,
    currentEvent,
    upcomingEvents,
    completedEvents: completedEvents.slice(0, 3),
    activeChallenges: activeChallengeRows.map((c) => ({
      id: c.id,
      status: c.status,
      event: c.event
        ? { id: c.event.id, name: c.event.name, slug: c.event.slug }
        : null,
      opponent: (profileMap.get(
        c.challenger_id === user.id ? c.challenged_id : c.challenger_id,
      ) as PublicProfileSummary | undefined) || null,
    })),
  };
}

export async function getEventPageData(slug: string) {
  const { supabase, user, profile } = await requirePageUserProfile();
  const event = await getCachedEventBySlug(slug);
  if (!event) {
    return { profile, user, event: null, existingPicks: [] };
  }
  const existingPicks = await listPicksForUserEvent(supabase, user.id, event.id);

  return { profile, user, event, existingPicks };
}

export async function getEventLiveData(slug: string) {
  const { supabase, user } = await requirePageUserProfile();
  const event = await getCachedEventBySlug(slug);
  if (!event) {
    return { status: "completed" as const, fights: [], picks: [], leaderboard: [], myScore: null };
  }

  const confirmedFights = (event as EventWithFights).fights.filter(
    (f) => f.result_confirmed,
  );
  const existingPicks = await listPicksForUserEvent(supabase, user.id, event.id);

  const fights = confirmedFights.map((f) => ({
    id: f.id,
    fight_order: f.fight_order,
    fighter_a: f.fighter_a,
    fighter_b: f.fighter_b,
    winner_id: f.winner_id,
    result_method: f.result_method,
    result_round: f.result_round,
  }));

  const picks = existingPicks.map((p) => ({
    fight_id: p.fight_id,
    winner_id: p.picked_winner_id,
    method: p.picked_method,
    round: p.picked_round,
    points_winner: p.points_winner,
    points_method: p.points_method,
    points_round: p.points_round,
  }));

  const [leaderboard, myScoreResult] = await Promise.all([
    listEventLeaderboard(supabase, event.id),
    getEventScoreRowForUserAndEvent(supabase, user.id, event.id),
  ]);

  const myScore = myScoreResult
    ? {
        total_points: myScoreResult.total_points,
        perfect_picks: myScoreResult.perfect_picks,
        fights_scored: myScoreResult.fights_scored,
        rank_position: myScoreResult.rank_position,
      }
    : null;

  return {
    status: event.status,
    fights,
    picks,
    leaderboard,
    myScore,
  };
}

export async function getRankingPageData(
  tab: "geral" | "evento" | "temporada",
  eventSlugParam?: string,
) {
  const { user, profile } = await requirePageUserProfile();
  const [currentEvent, completedRankingEvents, currentSeason] = await Promise.all([
    getCachedCurrentPublicEvent(),
    getCachedRecentCompletedRankingEvents(7),
    getCachedCurrentSeason(),
  ]);
  const { selectableEvents: rankingEvents, selectedEvent } =
    resolveRankingEventSelection({
      currentEvent: currentEvent
        ? {
            id: currentEvent.id,
            name: currentEvent.name,
            slug: currentEvent.slug,
            event_date: currentEvent.event_date,
          }
        : null,
      completedEvents: completedRankingEvents,
      selectedSlug: eventSlugParam,
      completedLimit: 7,
    });
  let displayRanking: RankingDisplayEntry[] = [];

  if (tab === "evento") {
    const eventRanking =
      selectedEvent ? await getCachedEventRanking(selectedEvent.id) : [];

    displayRanking = eventRanking.map((entry: EventRankingRow, index: number) => ({
      rank: index + 1,
      nickname: entry.profile?.nickname || "",
      first_name: entry.profile?.first_name || "",
      last_name: entry.profile?.last_name || "",
      points: entry.total_points,
      perfect_picks: entry.perfect_picks,
      userId: entry.user_id,
    }));
  } else if (tab === "temporada") {
    const seasonRanking = currentSeason
      ? await getCachedGlobalSeasonStandings(currentSeason.id)
      : [];

    displayRanking = seasonRanking.map((entry: any) => ({
      rank: entry.rank_position,
      nickname: entry.nickname,
      first_name: entry.first_name,
      last_name: entry.last_name,
      points: entry.total_points,
      perfect_picks: entry.perfect_picks,
      userId: entry.user_id,
    }));
  } else {
    const globalRanking = await getCachedGlobalRanking();

    displayRanking = globalRanking.map((rankingProfile: any, index: number) => ({
      rank: index + 1,
      nickname: rankingProfile.nickname,
      first_name: rankingProfile.first_name,
      last_name: rankingProfile.last_name,
      points: rankingProfile.total_points,
      perfect_picks: 0,
      userId: rankingProfile.id,
    }));
  }

  const myRank =
    displayRanking.find(
      (rankingEntry: RankingDisplayEntry) => rankingEntry.userId === user.id,
    ) || null;

  return {
    profile,
    currentEvent,
    selectedRankingEvent: selectedEvent,
    currentSeason,
    rankingEvents,
    displayRanking,
    myRank,
    tab,
  };
}

export async function getHistoryPageData() {
  const { supabase, user, profile } = await requirePageUserProfile();
  const [events, userScores] = await Promise.all([
    listCompletedEvents(supabase),
    getEventScoresForUser(supabase, user.id),
  ]);

  const scoresMap = Object.fromEntries(
    (userScores || []).map((score: any) => [score.event_id, score]),
  );

  return { profile, events, scoresMap };
}

export async function getHistoryEventPageData(slug: string) {
  const { supabase, user, profile } = await requirePageUserProfile();
  const [event, userPicks] = await Promise.all([
    getCachedEventBySlug(slug),
    listPicksForUser(supabase, user.id),
  ]);
  if (!event) {
    return { profile, event: null, picks: [], score: null };
  }

  const score = await getEventScoreForUserAndEvent(supabase, user.id, event.id);
  const picks = userPicks.filter((pick: any) => pick.event_id === event.id);

  return { profile, event, picks, score };
}

export async function getEventRecapData(slug: string): Promise<import("@/types").EventRecapData | null> {
  const supabase = getServiceRoleSupabase();
  const event = await getCachedEventBySlug(slug) as import("@/types").EventWithFights | null;
  if (!event) return null;

  const [ranking, scoreStats, pickDistribution, { data: nextEvent }] = await Promise.all([
    getCachedEventRanking(event.id),
    getEventScoreStats(supabase, event.id),
    getPickDistributionForEvent(supabase, event.id),
    supabase.from("events").select("slug").eq("status", "upcoming").gt("event_date", event.event_date).order("event_date", { ascending: true }).limit(1).maybeSingle(),
  ]);

  const fightStats: import("@/types").EventRecapFightStat[] = (event.fights || [])
    .slice()
    .sort((a: any, b: any) => a.fight_order - b.fight_order)
    .map((fight: any) => {
      const dist = pickDistribution[fight.id] || { fighter_a: 0, fighter_b: 0 };
      const total = dist.fighter_a + dist.fighter_b;
      const perfectCount = dist.fighter_a + dist.fighter_b > 0
        ? (fight.result_confirmed && fight.winner_id === fight.fighter_a_id ? dist.fighter_a
          : fight.result_confirmed && fight.winner_id === fight.fighter_b_id ? dist.fighter_b
          : 0)
        : 0;

      return {
        fight_id: fight.id,
        fighter_a_name: fight.fighter_a?.name || "",
        fighter_a_id: fight.fighter_a_id,
        fighter_b_name: fight.fighter_b?.name || "",
        fighter_b_id: fight.fighter_b_id,
        winner_id: fight.winner_id,
        result_method: fight.result_method,
        result_round: fight.result_round,
        result_confirmed: fight.result_confirmed,
        total_picks: total,
        pick_a_percent: total > 0 ? Math.round((dist.fighter_a / total) * 100) : 0,
        pick_b_percent: total > 0 ? Math.round((dist.fighter_b / total) * 100) : 0,
        perfect_pick_count: perfectCount,
      };
    });

  return {
    event,
    ranking: ranking.map((entry: any, index: number) => ({
      rank: index + 1,
      user_id: entry.user_id,
      nickname: entry.profile?.nickname || "",
      total_points: entry.total_points,
      perfect_picks: entry.perfect_picks || 0,
    })),
    aggregateStats: {
      total_players: scoreStats.scoredUsers,
      average_score: scoreStats.averagePoints,
      best_score: scoreStats.bestScore,
      total_perfect_picks: scoreStats.perfectPicks,
    },
    fightStats,
    nextEventSlug: (nextEvent as any)?.slug || null,
  };
}

export async function getProfilePageData() {
  const { profile } = await requirePageUserProfile();
  return { profile };
}

export async function getAdminPageData() {
  const context = await requireAdminPageProfile();
  const supabase = await getUserSupabase();
  const [events, users] = await Promise.all([
    listAdminEvents(supabase),
    listRecentProfiles(supabase, 100),
  ]);

  return {
    profile: context.profile,
    isAdmin: context.isAdmin,
    userId: context.user.id,
    events,
    users,
  };
}

export async function getMyProfile() {
  const { profile } = await requireActiveUser();
  return { profile };
}

export async function updateMyProfile(payload: {
  nickname?: string;
}) {
  const { supabase, user } = await requireActiveUser();

  try {
    const profile = await updateProfile(supabase, user.id, payload);
    return { profile };
  } catch (error: any) {
    if (payload.nickname && error?.message?.toLowerCase().includes("unique")) {
      throw new ApiRouteError(
        409,
        "NICKNAME_TAKEN",
        "Este nickname já está em uso.",
      );
    }
    throw error;
  }
}

export async function completeMyOnboarding() {
  const { supabase, user } = await requireActiveUser();
  const profile = await updateProfile(supabase, user.id, { onboarding_completed: true });
  return { profile };
}

function assertValidEventPicks(
  event: any,
  picks: Array<{
    fightId: string;
    winnerId: string;
    method: string;
    round: number;
  }>,
) {
  const fightsById = new Map<
    string,
    {
      id: string;
      fighter_a_id: string;
      fighter_b_id: string;
      total_rounds: number;
    }
  >(
    (event.fights || []).map((fight: any) => [String(fight.id), fight]),
  );
  const seenFightIds = new Set<string>();

  for (const pick of picks) {
    if (seenFightIds.has(pick.fightId)) {
      throw new ApiRouteError(
        400,
        "DUPLICATE_FIGHT_PICK",
        "Cada luta só pode receber um pick por envio.",
      );
    }
    seenFightIds.add(pick.fightId);

    const fight = fightsById.get(pick.fightId);
    if (!fight) {
      throw new ApiRouteError(
        400,
        "INVALID_FIGHT",
        "Uma ou mais lutas não pertencem a este evento.",
      );
    }

    const validWinnerIds = [fight.fighter_a_id, fight.fighter_b_id];
    if (!validWinnerIds.includes(pick.winnerId)) {
      throw new ApiRouteError(
        400,
        "INVALID_WINNER",
        "O vencedor escolhido não pertence à luta informada.",
      );
    }

    if (pick.round < 1 || pick.round > fight.total_rounds) {
      throw new ApiRouteError(
        400,
        "INVALID_ROUND",
        "O round informado não é válido para a luta escolhida.",
      );
    }

    if (pick.method === "decision" && pick.round !== fight.total_rounds) {
      throw new ApiRouteError(
        400,
        "INVALID_DECISION_ROUND",
        "Picks por decisão devem usar o round final da luta.",
      );
    }
  }
}

export async function saveMyEventPicks(
  slug: string,
  picks: Array<{
    fightId: string;
    winnerId: string;
    method: string;
    round: number;
  }>,
) {
  const { supabase, user } = await requireActiveUser();
  const event = await findEventBySlugForPickValidation(supabase, slug);
  if (!event) {
    throw new ApiRouteError(404, "EVENT_NOT_FOUND", "Evento não encontrado.");
  }

  if (event.picks_lock_at && new Date(event.picks_lock_at) < new Date()) {
    throw new ApiRouteError(403, "PICKS_CLOSED", "Os picks para este evento já estão fechados.");
  }

  assertValidEventPicks(event, picks);

  const payload = picks.map((pick) => ({
    user_id: user.id,
    fight_id: pick.fightId,
    event_id: event.id,
    picked_winner_id: pick.winnerId,
    picked_method: pick.method,
    picked_round: pick.round,
    is_confirmed: true,
    confirmed_at: new Date().toISOString(),
  }));

  await upsertUserPicks(supabase, payload);
  return { savedCount: payload.length };
}

export async function getPublicProfileStats(
  client: any,
  profileId: string,
): Promise<PublicProfileStats> {
  const [rawChallenges, eventScoresResult, rawPicksResult] = await Promise.all([
    listChallengesForProfile(client, profileId),
    client
      .from("event_scores")
      .select("rank_position, total_points, event_id")
      .eq("user_id", profileId),
    client
      .from("picks")
      .select(
        `
        picked_winner_id, picked_method, picked_round,
        points_winner, points_method, points_round,
        created_at,
        fight:fights!inner(
          result_confirmed, winner_id, result_method, result_round
        )
      `,
      )
      .eq("user_id", profileId)
      .order("created_at", { ascending: true }),
  ]);

  if (eventScoresResult.error) throw eventScoresResult.error;
  if (rawPicksResult.error) throw rawPicksResult.error;

  const challenges = await enrichChallenges(client, rawChallenges as ChallengeRow[]);
  const challengesPlayed = challenges.filter((challenge) =>
    ["accepted", "completed"].includes(challenge.status),
  ).length;
  const challengesWon = challenges.filter(
    (challenge) =>
      challenge.status === "completed" && challenge.winner_user_id === profileId,
  ).length;

  const allPicks = (rawPicksResult.data || []) as any[];
  const resolvedPicks = allPicks.filter((p) => p.fight?.result_confirmed);
  const totalResolvedPicks = resolvedPicks.length;
  const correctWinnerPicks = resolvedPicks.reduce(
    (sum, p) => sum + (p.points_winner || 0),
    0,
  );

  const correctMethodPicks = resolvedPicks.reduce(
    (sum, p) => sum + (p.points_method || 0),
    0,
  );
  const correctRoundPicks = resolvedPicks.reduce(
    (sum, p) => sum + (p.points_round || 0),
    0,
  );

  const rankValues = ((eventScoresResult.data || []) as any[])
    .map((entry) => Number(entry.rank_position))
    .filter((value) => Number.isFinite(value));

  const eventsWithPoints = ((eventScoresResult.data || []) as any[]).filter(
    (e: any) => Number.isFinite(Number(e.total_points)) && Number(e.total_points) > 0,
  );
  const totalPointsFromEvents = eventsWithPoints.reduce(
    (sum: number, e: any) => sum + Number(e.total_points),
    0,
  );

  // Streak: walk resolved picks in chronological order (ascending)
  let currentStreak = 0;
  let bestStreak = 0;
  for (const p of resolvedPicks) {
    if (p.points_winner && Number(p.points_winner) > 0) {
      currentStreak++;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  return {
    challenges_total: challengesPlayed,
    challenges_won: challengesWon,
    pick_accuracy: totalResolvedPicks
      ? Math.round((correctWinnerPicks / totalResolvedPicks) * 100)
      : 0,
    average_rank: rankValues.length
      ? Number(
          (
            rankValues.reduce((sum, value) => sum + value, 0) / rankValues.length
          ).toFixed(1),
        )
      : null,
    total_picks: allPicks.length,
    events_played: eventsWithPoints.length,
    avg_points_per_event: eventsWithPoints.length
      ? Math.round(totalPointsFromEvents / eventsWithPoints.length)
      : 0,
    method_accuracy: correctWinnerPicks
      ? Math.round((correctMethodPicks / correctWinnerPicks) * 100)
      : 0,
    round_accuracy: correctMethodPicks
      ? Math.round((correctRoundPicks / correctMethodPicks) * 100)
      : 0,
    current_streak: currentStreak,
    best_streak: bestStreak,
  };
}

export async function getPublicProfilePageData(nickname: string) {
  const { profile } = await requirePageUserProfile();
  const adminSupabase = await getAdminSupabase();
  const publicProfile = await findPublicProfileByNickname(adminSupabase, nickname);

  if (!publicProfile) {
    return {
      viewerProfile: profile,
      publicProfile: null,
      stats: null,
      currentEvent: null,
      existingChallenge: null,
      canChallenge: false,
      badges: [],
      rivalry: null,
    };
  }

  const [stats, currentEvent, userBadges, rivalry] = await Promise.all([
    getPublicProfileStats(adminSupabase, publicProfile.id),
    getCachedCurrentPublicEvent(),
    listUserBadges(adminSupabase, publicProfile.id),
    publicProfile.id !== profile.id
      ? getRivalry(adminSupabase, profile.id, publicProfile.id)
      : Promise.resolve(null),
  ]);

  const challengeableEvent = currentEvent || null;

  let existingChallenge = null;
  if (challengeableEvent && publicProfile.id !== profile.id) {
    existingChallenge = await findActiveChallengeBetweenUsers(
      adminSupabase,
      challengeableEvent.id,
      profile.id,
      publicProfile.id,
    );
  }

  const enrichedExistingChallenge = existingChallenge
    ? (
        await enrichChallenges(adminSupabase, [existingChallenge as ChallengeRow])
      )[0]
    : null;

  const recentBadges = (userBadges || [])
    .filter((ub) => ub.badge && !ub.badge.archived)
    .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime())
    .slice(0, 3)
    .map((ub) => ub.badge)
    .filter(Boolean);

  return {
    viewerProfile: profile,
    publicProfile,
    stats,
    currentEvent: challengeableEvent
      ? {
          id: challengeableEvent.id,
          name: challengeableEvent.name,
          slug: challengeableEvent.slug,
          picks_lock_at: challengeableEvent.picks_lock_at,
          status: challengeableEvent.status,
        }
      : null,
    existingChallenge: enrichedExistingChallenge || null,
    canChallenge:
      publicProfile.id !== profile.id &&
      !!challengeableEvent &&
      !enrichedExistingChallenge,
    badges: recentBadges,
    rivalry,
  };
}

export async function createUserChallenge(challengedId: string, eventId: string) {
  const { user } = await requireActiveUser();
  const adminSupabase = await getAdminSupabase();

  if (challengedId === user.id) {
    throw new ApiRouteError(
      400,
      "SELF_CHALLENGE",
      "Você não pode desafiar a si mesmo.",
    );
  }

  const [event, currentEvent, challengedProfile] = await Promise.all([
    findEventById(adminSupabase, eventId),
    getCurrentPublicEvent(adminSupabase),
    findPublicProfilesByIds(adminSupabase, [challengedId]),
  ]);

  if (!event) {
    throw new ApiRouteError(404, "EVENT_NOT_FOUND", "Evento não encontrado.");
  }

  if (!currentEvent) {
    throw new ApiRouteError(
      409,
      "NO_ACTIVE_EVENT",
      "Não há um evento atual disponível para desafios.",
    );
  }

  if (currentEvent.id !== event.id) {
    throw new ApiRouteError(
      409,
      "INVALID_CHALLENGE_EVENT",
      "Os desafios só podem ser criados para o evento atual.",
    );
  }

  const opponent = challengedProfile[0];
  if (!opponent) {
    throw new ApiRouteError(404, "PROFILE_NOT_FOUND", "Jogador não encontrado.");
  }

  const existingChallenge = await findActiveChallengeBetweenUsers(
    adminSupabase,
    event.id,
    user.id,
    challengedId,
  );

  if (existingChallenge) {
    throw new ApiRouteError(
      409,
      "CHALLENGE_EXISTS",
      "Já existe um desafio ativo entre vocês para este evento.",
    );
  }

  const challengerProfile = (
    await findPublicProfilesByIds(adminSupabase, [user.id])
  )[0];

  const challenge = await createChallenge(adminSupabase, {
    event_id: event.id,
    challenger_id: user.id,
    challenged_id: challengedId,
    status: "pending",
  }).catch(async (err) => {
    const recheck = await findActiveChallengeBetweenUsers(
      adminSupabase,
      event.id,
      user.id,
      challengedId,
    );
    if (recheck) {
      throw new ApiRouteError(
        409,
        "CHALLENGE_EXISTS",
        "Já existe um desafio ativo entre vocês para este evento.",
      );
    }
    throw err;
  });

  await createChallengeNotification(adminSupabase, {
    userId: challengedId,
    type: "challenge_received",
    title: `${challengerProfile?.nickname || "Um jogador"} te desafiou`,
    message: `Desafio direto para ${event.name}.`,
    challengeId: challenge.id,
    targetPath: `/desafios/${challenge.id}`,
  });

  return {
    challenge: (
      await enrichChallenges(adminSupabase, [
        { ...challenge, event } as ChallengeRow,
      ])
    )[0],
  };
}

export async function respondToChallenge(
  challengeId: string,
  action: "accept" | "decline",
) {
  const { user } = await requireActiveUser();
  const adminSupabase = await getAdminSupabase();
  const rawChallenge = (await findChallengeById(
    adminSupabase,
    challengeId,
  )) as ChallengeRow | null;

  if (!rawChallenge || !rawChallenge.event) {
    throw new ApiRouteError(
      404,
      "CHALLENGE_NOT_FOUND",
      "Desafio não encontrado.",
    );
  }

  const challenge = (await resolveChallengeLifecycle(
    adminSupabase,
    rawChallenge,
  )) as ChallengeRow;

  if (challenge.challenged_id !== user.id) {
    throw new ApiRouteError(
      403,
      "FORBIDDEN",
      "Somente o jogador desafiado pode responder a este desafio.",
    );
  }

  if (challenge.status !== "pending") {
    throw new ApiRouteError(
      409,
      "CHALLENGE_CLOSED",
      "Este desafio não está mais pendente.",
    );
  }

  const nextStatus = action === "accept" ? "accepted" : "declined";
  const updatedChallenge = await updateChallenge(adminSupabase, challenge.id, {
    status: nextStatus,
    responded_at: new Date().toISOString(),
  });
  const challengeWithEvent = {
    ...updatedChallenge,
    event: challenge.event,
  } as ChallengeRow;

  const profiles = await findPublicProfilesByIds(adminSupabase, [
    challengeWithEvent.challenger_id,
    challengeWithEvent.challenged_id,
  ]);
  const profileMap = new Map<string, RankingProfileRow>(
    profiles.map((profile: any) => [String(profile.id), profile as RankingProfileRow]),
  );
  const challengedProfile = profileMap.get(challengeWithEvent.challenged_id);

  await createChallengeNotification(adminSupabase, {
    userId: challengeWithEvent.challenger_id,
    type:
      action === "accept" ? "challenge_accepted" : "challenge_declined",
    title:
      action === "accept"
        ? `${challengedProfile?.nickname || "Seu oponente"} aceitou o desafio`
        : `${challengedProfile?.nickname || "Seu oponente"} recusou o desafio`,
    message: `Resposta ao desafio de ${challengeWithEvent.event?.name || "evento"}.`,
    challengeId: challengeWithEvent.id,
    targetPath: `/desafios/${challengeWithEvent.id}`,
  });

  return {
    challenge: (
      await enrichChallenges(adminSupabase, [challengeWithEvent])
    )[0],
  };
}

export async function getChallengesPageData() {
  const { profile, user } = await requirePageUserProfile();
  const adminSupabase = await getAdminSupabase();
  const currentEventPromise = getCachedCurrentPublicEvent();
  const [rawChallenges, notifications, unreadCount, currentEvent, publicProfiles] =
    await Promise.all([
      listChallengesForUser(adminSupabase, user.id),
      listNotificationsForUser(adminSupabase, user.id, 12),
      countUnreadNotifications(adminSupabase, user.id),
      currentEventPromise,
      listPublicProfiles(adminSupabase, 100),
    ]);

  const challenges = await enrichChallenges(
    adminSupabase,
    rawChallenges as ChallengeRow[],
  );

  const currentEventChallenges = currentEvent
    ? challenges.filter(
        (challenge) =>
          challenge.event_id === currentEvent.id &&
          ["pending", "accepted"].includes(challenge.status),
      )
    : [];

  const activeChallengeByOpponentId = new Map<
    string,
    { id: string; status: Challenge["status"] }
  >();

  currentEventChallenges.forEach((challenge) => {
    const opponentId =
      challenge.challenger_id === user.id
        ? challenge.challenged_id
        : challenge.challenger_id;

    activeChallengeByOpponentId.set(opponentId, {
      id: challenge.id,
      status: challenge.status,
    });
  });

  const opponents = (publicProfiles as RankingProfileRow[])
    .filter((publicProfile) => publicProfile.id !== user.id)
    .map((publicProfile) => ({
      ...publicProfile,
      existingChallenge: activeChallengeByOpponentId.get(publicProfile.id) || null,
    }));

  return {
    profile,
    userId: user.id,
    currentEvent: currentEvent
      ? {
          id: currentEvent.id,
          name: currentEvent.name,
          slug: currentEvent.slug,
          picks_lock_at: currentEvent.picks_lock_at,
          status: currentEvent.status,
        }
      : null,
    opponents,
    incoming: challenges.filter(
      (challenge) =>
        challenge.challenged_id === user.id && challenge.status === "pending",
    ),
    outgoing: challenges.filter(
      (challenge) =>
        challenge.challenger_id === user.id && challenge.status === "pending",
    ),
    active: challenges.filter((challenge) => challenge.status === "accepted"),
    history: challenges.filter((challenge) =>
      ["declined", "expired", "completed"].includes(challenge.status),
    ),
    notifications: notifications as AppNotification[],
    unreadCount,
  };
}

export async function getChallengeDetailPageData(challengeId: string) {
  const { profile, user } = await requirePageUserProfile();
  const adminSupabase = await getAdminSupabase();
  const rawChallenge = (await findChallengeById(
    adminSupabase,
    challengeId,
  )) as ChallengeRow | null;

  if (!rawChallenge || !rawChallenge.event) {
    return {
      profile,
      userId: user.id,
      challenge: null,
      comparisons: [],
      picksVisible: false,
      nextEvent: null,
    };
  }

  if (![rawChallenge.challenger_id, rawChallenge.challenged_id].includes(user.id)) {
    throw new ApiRouteError(403, "FORBIDDEN", "Você não participa deste desafio.");
  }

  const challenge = (
    await enrichChallenges(adminSupabase, [rawChallenge])
  )[0];
  const picksVisible =
    challenge.status !== "pending" && hasDatePassed(challenge.event.picks_lock_at);

  let comparisons: ChallengeFightComparison[] = [];

  if (picksVisible) {
    const rawPicks = await listPicksForUsersEvent(
      adminSupabase,
      [challenge.challenger_id, challenge.challenged_id],
      challenge.event_id,
    );

    const fightsById = new Map<string, FightWithFighters>();
    const challengerPicks = new Map<string, any>();
    const challengedPicks = new Map<string, any>();

    (rawPicks as any[]).forEach((pick) => {
      if (pick.fight) {
        fightsById.set(pick.fight.id, pick.fight as FightWithFighters);
      }
      if (pick.user_id === challenge.challenger_id) {
        challengerPicks.set(pick.fight_id, pick);
      } else if (pick.user_id === challenge.challenged_id) {
        challengedPicks.set(pick.fight_id, pick);
      }
    });

    comparisons = Array.from(fightsById.values())
      .sort((left, right) => {
        if (left.card_type !== right.card_type) {
          return left.card_type === "main" ? -1 : 1;
        }
        return left.fight_order - right.fight_order;
      })
      .map((fight) => ({
        fight,
        challengerPick: challengerPicks.get(fight.id) || null,
        challengedPick: challengedPicks.get(fight.id) || null,
      }));
  }

  const isCompletable =
    challenge.status === "completed" ||
    challenge.status === "declined" ||
    challenge.status === "expired";

  let nextEvent: { id: string; name: string; slug: string; picks_lock_at: string } | null = null;
  if (isCompletable && challenge.event) {
    const upcomingEvents = await listUpcomingEvents(adminSupabase, 5);
    const nextUpcoming = upcomingEvents.find(
      (e: any) => e.id !== challenge.event_id,
    );
    if (nextUpcoming) {
      nextEvent = {
        id: nextUpcoming.id,
        name: nextUpcoming.name,
        slug: nextUpcoming.slug,
        picks_lock_at: nextUpcoming.picks_lock_at,
      };
    }
  }

  return {
    profile,
    userId: user.id,
    challenge,
    comparisons,
    picksVisible,
    nextEvent,
  };
}

export async function getMyNotifications() {
  const { user } = await requireActiveUser();
  const adminSupabase = await getAdminSupabase();
  const [notifications, unreadCount] = await Promise.all([
    listNotificationsForUser(adminSupabase, user.id, 8),
    countUnreadNotifications(adminSupabase, user.id),
  ]);

  return {
    notifications: notifications as AppNotification[],
    unreadCount,
  };
}

export async function markMyNotificationRead(notificationId: string) {
  const { user } = await requireActiveUser();
  const adminSupabase = await getAdminSupabase();
  const notification = await markNotificationAsRead(
    adminSupabase,
    notificationId,
    user.id,
  );

  return { notification };
}

export async function clearMyNotifications() {
  const { user } = await requireActiveUser();
  const adminSupabase = await getAdminSupabase();
  await markAllNotificationsAsRead(adminSupabase, user.id);
}

export async function getAdminEventFights(eventId: string) {
  const adminSupabase = await getAdminSupabase();
  return listEventFights(adminSupabase, eventId);
}

export async function getAdminPendingFights() {
  const adminSupabase = await getAdminSupabase();
  const fights = await listPendingFights(adminSupabase);
  return fights.map((fight: any) => ({
    ...fight,
    fighter_a: Array.isArray(fight.fighter_a)
      ? fight.fighter_a[0] || null
      : fight.fighter_a,
    fighter_b: Array.isArray(fight.fighter_b)
      ? fight.fighter_b[0] || null
      : fight.fighter_b,
    event: Array.isArray(fight.event) ? fight.event[0] || null : fight.event,
  }));
}

export async function getAdminEvent(eventId: string) {
  const adminSupabase = await getAdminSupabase();
  return findEventById(adminSupabase, eventId);
}

const EVENT_RESULT_SOURCE_FIELDS = [
  "ufc_event_id",
  "ufc_stats_url",
  "espn_fightcenter_url",
  "sherdog_event_url",
  "tapology_event_url",
] as const;

function normalizeEventSourceFields(payload: Record<string, unknown>) {
  const normalized: Record<string, unknown> = { ...payload };

  for (const field of EVENT_RESULT_SOURCE_FIELDS) {
    if (typeof normalized[field] === "string" && !normalized[field].trim()) {
      normalized[field] = null;
    }
  }

  return normalized;
}

export async function createAdminEvent(payload: {
  name: string;
  location?: string;
  event_date: string;
  picks_lock_at?: string;
  picks_open_at?: string;
  banner_image_url?: string;
  ufc_event_id?: string;
  ufc_stats_url?: string;
  espn_fightcenter_url?: string;
  sherdog_event_url?: string;
  tapology_event_url?: string;
  status?: "upcoming" | "live" | "completed";
}) {
  const adminSupabase = await getAdminSupabase();
  const normalizedPayload = normalizeEventSourceFields(payload);

  return createEvent(adminSupabase, {
    ...normalizedPayload,
    slug: slugifyEventName(payload.name),
    status: payload.status || "upcoming",
  });
}

export async function updateAdminEventById(
  eventId: string,
  payload: Record<string, unknown>,
) {
  const adminSupabase = await getAdminSupabase();
  const event = await updateEvent(
    adminSupabase,
    eventId,
    normalizeEventSourceFields(payload),
  );

  if (shouldNotifyPicksOpened(event)) {
    await safelyNotifyActiveUsers(adminSupabase, {
      type: "picks_opened",
      event: toNotificationEvent(event),
    });
  }

  return event;
}

async function resolveOrCreateFighter(
  adminSupabase: any,
  fighter: { name: string; headshot_url?: string; country?: string },
) {
  const existing = await findFighterByName(adminSupabase, fighter.name);

  if (existing) {
    if (fighter.headshot_url || fighter.country) {
      await updateFighter(adminSupabase, existing.id, {
        headshot_url: fighter.headshot_url || null,
        country: fighter.country || null,
      });
    }
    return existing.id;
  }

  const created = await createFighter(adminSupabase, {
    name: fighter.name,
    headshot_url: fighter.headshot_url || "",
    country: fighter.country || "",
  });

  return created.id;
}

export async function createAdminFightForEvent(
  eventId: string,
  payload: {
    fighter_a: { name: string; headshot_url?: string; country?: string };
    fighter_b: { name: string; headshot_url?: string; country?: string };
    weight_class: string;
    is_title_fight: boolean;
    total_rounds: number;
    card_type: string;
    fight_order: number;
  },
) {
  const adminSupabase = await getAdminSupabase();
  const [fighterAId, fighterBId] = await Promise.all([
    resolveOrCreateFighter(adminSupabase, payload.fighter_a),
    resolveOrCreateFighter(adminSupabase, payload.fighter_b),
  ]);

  const [event, fight] = await Promise.all([
    findEventById(adminSupabase, eventId),
    createFight(adminSupabase, {
      event_id: eventId,
      fighter_a_id: fighterAId,
      fighter_b_id: fighterBId,
      weight_class: payload.weight_class,
      is_title_fight: payload.is_title_fight,
      total_rounds: payload.total_rounds,
      card_type: payload.card_type,
      fight_order: payload.fight_order,
    }),
  ]);

  await safelyNotifyActiveUsers(adminSupabase, {
    type: "fight_added",
    event: toNotificationEvent(event),
    fightId: fight.id,
    fightName: `${payload.fighter_a.name} vs ${payload.fighter_b.name}`,
  });

  return fight;
}

export async function updateAdminFightById(
  fightId: string,
  payload: Record<string, unknown>,
) {
  const adminSupabase = await getAdminSupabase();
  return updateFight(adminSupabase, fightId, payload);
}

export async function deleteAdminFightById(fightId: string) {
  const adminSupabase = await getAdminSupabase();
  const fight = await findFightById(adminSupabase, fightId);
  const event = getSingleRelation(fight.event);

  const result = await deleteFight(adminSupabase, fightId);

  if (event) {
    await safelyNotifyActiveUsers(adminSupabase, {
      type: "fight_removed",
      event: toNotificationEvent(event),
      fightId: fight.id,
      fightName: `${getRelatedFighterName(fight.fighter_a)} vs ${getRelatedFighterName(
        fight.fighter_b,
      )}`,
    });
  }

  return result;
}

export async function reorderAdminEventFights(
  eventId: string,
  orderedFightIds: string[],
) {
  const adminSupabase = await getAdminSupabase();
  const fights = await listEventFights(adminSupabase, eventId);
  const currentFightsById = new Map(
    fights.map((fight: any) => [fight.id, fight]),
  );
  const orderedFights = orderedFightIds
    .map((fightId) => currentFightsById.get(fightId))
    .filter(Boolean);

  const mainFights = orderedFights.filter(
    (fight: any) => fight.card_type === "main",
  );
  const prelimFights = orderedFights.filter(
    (fight: any) => fight.card_type === "preliminary",
  );

  await Promise.all(
    [...mainFights, ...prelimFights].map((fight: any) => {
      const sameCard = orderedFights.filter(
        (candidate: any) => candidate.card_type === fight.card_type,
      );
      const orderInCard =
        sameCard.findIndex((candidate: any) => candidate.id === fight.id) + 1;
      return updateFight(adminSupabase, fight.id, { fight_order: orderInCard });
    }),
  );

  return { updatedCount: orderedFights.length };
}

export async function updateAdminFightOdds(
  eventId: string,
  updates: Array<{ fightId: string; odds_a: string | null; odds_b: string | null }>,
) {
  const adminSupabase = await getAdminSupabase();
  await Promise.all(
    updates.map((update) =>
      updateFight(adminSupabase, update.fightId, {
        odds_a: update.odds_a,
        odds_b: update.odds_b,
      }),
    ),
  );

  return { updatedCount: updates.length, eventId };
}

export async function updateAdminFightLinks(
  eventId: string,
  updates: Array<{ fightId: string; value: string | null }>,
) {
  const adminSupabase = await getAdminSupabase();
  await Promise.all(
    updates.map((update) =>
      updateFight(adminSupabase, update.fightId, {
        ufc_matchup_url: update.value,
      }),
    ),
  );

  return { updatedCount: updates.length, eventId };
}

export async function setAdminFightResult(
  fightId: string,
  payload: {
    winner_side: "a" | "b";
    method: "decision" | "submission" | "knockout";
    round: number;
  },
) {
  const adminSupabase = await getAdminSupabase();
  const fight = await findFightById(adminSupabase, fightId);
  const winnerId =
    payload.winner_side === "a" ? fight.fighter_a_id : fight.fighter_b_id;
  const resultRound = payload.method === "decision" ? 3 : payload.round;

  await updateFight(adminSupabase, fightId, {
    winner_id: winnerId,
    result_method: payload.method,
    result_round: resultRound,
    result_confirmed: true,
  });

  const { error } = await adminSupabase.rpc("score_picks_for_fight", {
    p_fight_id: fightId,
  });

  if (error) throw error;

  const event = getSingleRelation(fight.event);
  if (event) {
    const [perfectPicks, confirmedPickCount, activeRecipients] = await Promise.all([
      listPerfectPickUsersForFight(adminSupabase, fightId),
      countConfirmedPicksForFight(adminSupabase, fightId),
      listActiveNotificationRecipients(adminSupabase),
    ]);
    const activeUserIds = new Set(
      activeRecipients.map((profile: { id: string }) => profile.id),
    );
    const perfectPickUserIds: string[] = Array.from(
      new Set<string>(
        perfectPicks
          .map((pick: { user_id: string }) => pick.user_id)
          .filter((userId: string) => activeUserIds.has(userId)),
      ),
    );

    await safelyNotifyUsers(adminSupabase, {
      userIds: perfectPickUserIds,
      type: "perfect_pick",
      event: toNotificationEvent(event),
      fightId,
      fightName: `${getRelatedFighterName(fight.fighter_a)} vs ${getRelatedFighterName(
        fight.fighter_b,
      )}`,
      perfectPickRarity: {
        perfectPickCount: perfectPicks.length,
        confirmedPickCount,
      },
    });

    await completeEventIfAllResultsConfirmed(adminSupabase, event.id);
  }

  return {
    fight,
    resultRound,
  };
}

export async function getAdminFighters() {
  const adminSupabase = await getAdminSupabase();
  return listAllFighters(adminSupabase);
}

export async function getAdminAuditLogs(action?: string) {
  const adminSupabase = await getAdminSupabase();
  return listActivityLogs(adminSupabase, 200, action);
}

export async function toggleAdminUserRole(userId: string, currentRole: string) {
  const adminSupabase = await getAdminSupabase();
  const newRole = currentRole === "admin" ? "user" : "admin";
  const profile = await updateProfileRole(adminSupabase, userId, newRole);
  return { profile, newRole };
}

export async function toggleAdminUserBan(userId: string, currentBan: boolean) {
  const adminSupabase = await getAdminSupabase();
  const profile = await updateProfileBan(adminSupabase, userId, !currentBan);
  return { profile, isBanned: !currentBan };
}

// ── Groups / Leagues ────────────────────────────────────────

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createGroupWithMember(name: string, description: string | null) {
  const { user, profile } = await requireActiveUser();
  if (profile.is_banned) {
    throw new ApiRouteError(403, "BANNED", "Usuário banido não pode criar grupos.");
  }
  const adminSupabase = await getAdminSupabase();
  const inviteCode = generateInviteCode();
  const group = await createGroup(adminSupabase, {
    name,
    description,
    invite_code: inviteCode,
    created_by: user.id,
  });
  await addGroupMember(adminSupabase, {
    group_id: group.id,
    user_id: user.id,
    role: "admin",
  });
  return group;
}

export async function joinGroupByCode(code: string) {
  const { user, profile } = await requireActiveUser();
  if (profile.is_banned) {
    throw new ApiRouteError(403, "BANNED", "Usuário banido não pode entrar em grupos.");
  }
  const adminSupabase = await getAdminSupabase();
  const group = await findGroupByInviteCode(adminSupabase, code);
  if (!group) {
    throw new ApiRouteError(404, "GROUP_NOT_FOUND", "Código de convite inválido.");
  }
  const existing = await getGroupMember(adminSupabase, group.id, user.id);
  if (existing) {
    throw new ApiRouteError(409, "ALREADY_MEMBER", "Você já está neste grupo.");
  }
  await addGroupMember(adminSupabase, {
    group_id: group.id,
    user_id: user.id,
    role: "member",
  });
  return group;
}

export async function processInviteLink(code: string) {
  const adminSupabase = await getAdminSupabase();
  const group = await findGroupByInviteCode(adminSupabase, code);
  if (!group) return { status: "invalid" as const };

  const userSupabase = await getUserSupabase();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user) {
    return { status: "needs_login" as const, group };
  }

  const existing = await getGroupMember(adminSupabase, group.id, user.id);
  if (existing) {
    return { status: "already_member" as const, group };
  }

  const profile = await findProfileById(userSupabase, user.id);
  if (!profile || profile.is_banned) {
    return { status: "banned" as const, group };
  }

  await addGroupMember(adminSupabase, {
    group_id: group.id,
    user_id: user.id,
    role: "member",
  });

  return { status: "joined" as const, group };
}

export async function leaveGroup(groupId: string) {
  const { user } = await requireActiveUser();
  const adminSupabase = await getAdminSupabase();
  const members = await listGroupMembers(adminSupabase, groupId);
  const admins = members.filter((m: any) => m.role === "admin");
  if (admins.length === 1 && admins[0].user_id === user.id && members.length > 1) {
    throw new ApiRouteError(400, "LAST_ADMIN", "Transfira a administração antes de sair.");
  }
  await removeGroupMember(adminSupabase, groupId, user.id);
}

export async function getMyGroups(client?: any, uid?: string) {
  if (client && uid) {
    return listGroupsForUser(client, uid);
  }
  const { supabase, user } = await requirePageUserProfile();
  return listGroupsForUser(supabase, user.id);
}

export async function getEnrichedMyGroups(): Promise<import("@/types").EnrichedGroup[]> {
  const { supabase, user } = await requirePageUserProfile();
  const groups = await listGroupsForUser(supabase, user.id);
  if (!groups.length) return [];

  const groupIds = groups.map((g: any) => g.id);
  const adminSupabase = await getAdminSupabase();
  const [memberCounts, currentSeason] = await Promise.all([
    countMembersForGroups(supabase, groupIds),
    getCurrentSeason(adminSupabase),
  ]);

  const champions = currentSeason
    ? await listGroupChampions(adminSupabase, groupIds, currentSeason.id)
    : {};

  const enriched: import("@/types").EnrichedGroup[] = await Promise.all(
    groups.map(async (group: any) => {
      const memberCount = memberCounts[group.id] || 0;
      const champion = champions[group.id] || null;

      let myRank: number | null = null;
      if (currentSeason) {
        const standings = await listGroupSeasonStandings(adminSupabase, group.id, currentSeason.id);
        const entry = standings.find((s: any) => s.user_id === user.id);
        myRank = entry?.rank_position || null;
      }

      return {
        ...group,
        member_count: memberCount,
        champion,
        my_rank: myRank,
      };
    }),
  );

  return enriched;
}

export async function getGroupDetail(groupId: string): Promise<GroupWithMembers | null> {
  const adminSupabase = await getAdminSupabase();
  const group = await findGroupById(adminSupabase, groupId);
  if (!group) return null;
  const [members, currentSeason] = await Promise.all([
    listGroupMembers(adminSupabase, groupId),
    getCurrentSeason(adminSupabase),
  ]);
  const standings = currentSeason
    ? await listGroupSeasonStandings(adminSupabase, groupId, currentSeason.id)
    : [];
  const standingMap = new Map(standings.map((s) => [s.user_id, s]));
  const enrichedMembers = members.map((m: any) => {
    const standing = standingMap.get(m.user_id);
    return {
      ...m,
      profile: m.profile || null,
      total_points: standing?.total_points || 0,
      perfect_picks: standing?.perfect_picks || 0,
      events_played: standing?.events_played || 0,
      rank_position: standing?.rank_position || 9999,
    };
  });
  enrichedMembers.sort((a: any, b: any) => a.rank_position - b.rank_position);
  return {
    ...group,
    current_season: currentSeason,
    members: enrichedMembers,
    member_count: enrichedMembers.length,
  } as GroupWithMembers;
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  picks_opened: true,
  picks_closed: true,
  picks_reminders: true,
  card_updated: true,
  perfect_pick: true,
  challenge_received: true,
  challenge_accepted: true,
  challenge_declined: true,
  challenge_result: true,
  badge_earned: true,
  event_completed: true,
};

export async function getMyNotificationPreferences() {
  const { supabase, user } = await requireActiveUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("id", user.id)
    .single();
  if (error) throw error;
  return (data?.notification_preferences || DEFAULT_NOTIFICATION_PREFERENCES) as NotificationPreferences;
}

export async function updateMyNotificationPreferences(preferences: NotificationPreferences) {
  const { supabase, user } = await requireActiveUser();
  const { data, error } = await supabase
    .from("profiles")
    .update({ notification_preferences: preferences })
    .eq("id", user.id)
    .select("notification_preferences")
    .single();
  if (error) throw error;
  return data?.notification_preferences as NotificationPreferences;
}
