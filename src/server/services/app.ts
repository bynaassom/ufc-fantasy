import type { Event, Profile } from "@/types";
import { ApiRouteError } from "@/server/api";
import { requireActiveUser } from "@/server/auth/guards";
import {
  createEvent,
  findEventById,
  findEventBySlugWithFights,
  getCurrentEventForRanking,
  getCurrentPublicEvent,
  listCompletedEvents,
  listRecentEvents,
  listUpcomingAndCompletedEvents,
  updateEvent,
} from "@/server/repositories/events";
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
  listPicksForUser,
  listPicksForUserEvent,
  upsertUserPicks,
} from "@/server/repositories/picks";
import {
  listRecentProfiles,
  updateProfileBan,
  updateProfileNickname,
  updateProfileRole,
} from "@/server/repositories/profiles";
import {
  requireAdminPageProfile,
  requirePageUserProfile,
} from "@/server/services/page-auth";
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

function slugifyEventName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
  const supabase = await getUserSupabase();
  const currentEvent = await getCurrentPublicEvent(supabase);
  return { currentEvent: (currentEvent as Event | null) || null };
}

export async function getHomePageData() {
  const { profile } = await requirePageUserProfile();
  const supabase = await getUserSupabase();
  const events = (await listUpcomingAndCompletedEvents(supabase, 10)) as Event[];

  const currentEvent =
    events.find((event) => event.status === "live" || event.status === "upcoming") ||
    null;
  const upcomingEvents = events.filter(
    (event) => event.status === "upcoming" && event.id !== currentEvent?.id,
  );
  const completedEvents = events
    .filter((event) => event.status === "completed")
    .sort(
      (left, right) =>
        new Date(right.event_date).getTime() - new Date(left.event_date).getTime(),
    )
    .slice(0, 3);

  return { profile, currentEvent, upcomingEvents, completedEvents };
}

export async function getEventPageData(slug: string) {
  const { supabase, user, profile } = await requirePageUserProfile();
  const event = await findEventBySlugWithFights(supabase, slug);
  if (!event) {
    return { profile, user, event: null, existingPicks: [] };
  }
  const existingPicks = await listPicksForUserEvent(supabase, user.id, event.id);

  return { profile, user, event, existingPicks };
}

export async function getRankingPageData(tab: "geral" | "evento") {
  const { supabase, user, profile } = await requirePageUserProfile();
  const [globalRanking, currentEvent] = await Promise.all([
    getGlobalRanking(supabase),
    getCurrentEventForRanking(supabase),
  ]);

  let eventRanking: EventRankingRow[] = [];
  if (currentEvent) {
    const ranking = await getEventRanking(supabase, currentEvent.id);
    const userIds = ranking.map((entry: any) => entry.user_id);
    const profiles = await getRankingProfilesByIds(supabase, userIds);
    const profileMap = new Map(
      profiles.map((entry: any) => [entry.id, entry as RankingProfileRow]),
    );

    eventRanking = ranking
      .map((entry: any) => ({
        ...entry,
        profile: profileMap.get(entry.user_id) || null,
      }))
      .filter((entry: EventRankingRow) => entry.profile);
  }

  const geralList: RankingDisplayEntry[] = globalRanking.map(
    (rankingProfile: any, index: number) => ({
      rank: index + 1,
      nickname: rankingProfile.nickname,
      first_name: rankingProfile.first_name,
      last_name: rankingProfile.last_name,
      points: rankingProfile.total_points,
      perfect_picks: 0,
      userId: rankingProfile.id,
    }),
  );

  const eventoList: RankingDisplayEntry[] = eventRanking.map(
    (entry: EventRankingRow, index: number) => ({
      rank: index + 1,
      nickname: entry.profile?.nickname || "",
      first_name: entry.profile?.first_name || "",
      last_name: entry.profile?.last_name || "",
      points: entry.total_points,
      perfect_picks: entry.perfect_picks,
      userId: entry.user_id,
    }),
  );

  const displayRanking: RankingDisplayEntry[] =
    tab === "evento" ? eventoList : geralList;
  const myRank =
    displayRanking.find(
      (rankingEntry: RankingDisplayEntry) => rankingEntry.userId === user.id,
    ) || null;

  return {
    profile,
    currentEvent,
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
    findEventBySlugWithFights(supabase, slug),
    listPicksForUser(supabase, user.id),
  ]);
  if (!event) {
    return { profile, event: null, picks: [], score: null };
  }

  const score = await getEventScoreForUserAndEvent(supabase, user.id, event.id);
  const picks = userPicks.filter((pick: any) => pick.event_id === event.id);

  return { profile, event, picks, score };
}

export async function getProfilePageData() {
  const { profile } = await requirePageUserProfile();
  return { profile };
}

export async function getAdminPageData() {
  const context = await requireAdminPageProfile();
  const supabase = await getUserSupabase();
  const [events, users] = await Promise.all([
    listRecentEvents(supabase, 20),
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

export async function updateMyProfileNickname(nickname: string) {
  const { supabase, user } = await requireActiveUser();

  try {
    const profile = await updateProfileNickname(supabase, user.id, nickname);
    return { profile };
  } catch (error: any) {
    if (error?.message?.toLowerCase().includes("unique")) {
      throw new ApiRouteError(
        409,
        "NICKNAME_TAKEN",
        "Este nickname já está em uso.",
      );
    }
    throw error;
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
  const event = await findEventBySlugWithFights(supabase, slug);
  if (!event) {
    throw new ApiRouteError(404, "EVENT_NOT_FOUND", "Evento não encontrado.");
  }

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

export async function createAdminEvent(payload: {
  name: string;
  location?: string;
  event_date: string;
  picks_lock_at?: string;
  picks_open_at?: string;
  banner_image_url?: string;
  ufc_stats_url?: string;
  status?: "upcoming" | "live" | "completed";
}) {
  const adminSupabase = await getAdminSupabase();
  return createEvent(adminSupabase, {
    ...payload,
    slug: slugifyEventName(payload.name),
    status: payload.status || "upcoming",
  });
}

export async function updateAdminEventById(
  eventId: string,
  payload: Record<string, unknown>,
) {
  const adminSupabase = await getAdminSupabase();
  return updateEvent(adminSupabase, eventId, payload);
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

  return createFight(adminSupabase, {
    event_id: eventId,
    fighter_a_id: fighterAId,
    fighter_b_id: fighterBId,
    weight_class: payload.weight_class,
    is_title_fight: payload.is_title_fight,
    total_rounds: payload.total_rounds,
    card_type: payload.card_type,
    fight_order: payload.fight_order,
  });
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
  return deleteFight(adminSupabase, fightId);
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

  return {
    fight,
    resultRound,
  };
}

export async function getAdminFighters() {
  const adminSupabase = await getAdminSupabase();
  return listAllFighters(adminSupabase);
}

export async function getAdminAuditLogs() {
  const adminSupabase = await getAdminSupabase();
  return listActivityLogs(adminSupabase, 200);
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
