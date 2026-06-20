import { getAdminSupabase } from "@/server/supabase";
import {
  getUserLeagueIds,
  getGroupMembers,
  getMemberEventScore,
  getMemberTotalPoints,
  getPreviousCompletedEventId,
} from "@/server/repositories/league-recap";
import { logAdminAction } from "@/lib/admin-audit";
import { notifyLeagueRankChanged } from "@/server/services/notifications";
import type { LeagueRecapStanding, LeagueRecapMember } from "@/types";

export async function computeLeagueRecap(
  userId: string,
  eventId: string,
): Promise<LeagueRecapStanding[]> {
  const admin = await getAdminSupabase();

  const { data: eventData } = await admin
    .from("events")
    .select("name, slug")
    .eq("id", eventId)
    .single();
  const eventName = eventData?.name || "—";
  const eventSlug = eventData?.slug || "—";

  const leagues = await getUserLeagueIds(admin, userId);
  if (leagues.length === 0) return [];

  const prevEventId = await getPreviousCompletedEventId(admin, eventId);

  const results: LeagueRecapStanding[] = [];

  for (const league of leagues) {
    try {
      const members = await getGroupMembers(admin, league.group_id);

      const currentScores = await Promise.all(
        members.map((m) => getMemberEventScore(admin, m.userId, eventId)),
      );

      const prevScores = prevEventId
        ? await Promise.all(
            members.map((m) => getMemberEventScore(admin, m.userId, prevEventId)),
          )
        : null;

      const totalPoints = await Promise.all(
        members.map((m) => getMemberTotalPoints(admin, m.userId, eventId)),
      );

      const currentRanked = members
        .map((m, i) => ({ ...m, points: currentScores[i]?.totalPoints ?? 0 }))
        .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

      const prevRanked = prevScores
        ? members
            .map((m, i) => ({ ...m, points: prevScores![i]?.totalPoints ?? 0 }))
            .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
        : null;

      const prevRankMap = new Map<string, number>();
      if (prevRanked) {
        prevRanked.forEach((m, i) => prevRankMap.set(m.userId, i + 1));
      }

      const membersList: LeagueRecapMember[] = currentRanked.map((m, i) => {
        const currentPos = i + 1;
        const prevPos = prevRankMap.get(m.userId);
        let movement: LeagueRecapMember["movement"] = "same";
        let movementDelta = 0;
        if (!prevRanked) {
          movement = "new";
        } else if (prevPos === undefined) {
          movement = "new";
        } else {
          movementDelta = prevPos - currentPos;
          movement = movementDelta > 0 ? "up" : movementDelta < 0 ? "down" : "same";
          movementDelta = Math.abs(movementDelta);
        }

        const memberIdx = members.findIndex((mb) => mb.userId === m.userId);

        return {
          position: currentPos,
          userId: m.userId,
          name: m.name,
          nickname: m.nickname,
          totalPoints: memberIdx >= 0 ? totalPoints[memberIdx] ?? 0 : 0,
          eventXp: m.points,
          movement,
          movementDelta,
          isCurrentUser: m.userId === userId,
        };
      });

      results.push({
        groupId: league.group_id,
        groupName: league.group_name,
        members: membersList,
      });

      try {
        const currentUserEntry = membersList.find((m) => m.isCurrentUser);
        const prevPos = currentUserEntry && prevRanked
          ? prevRankMap.get(userId)
          : undefined;
        if (
          currentUserEntry &&
          prevPos !== undefined &&
          currentUserEntry.position !== prevPos
        ) {
          await notifyLeagueRankChanged(
            userId,
            league.group_name,
            eventName,
            eventSlug,
            currentUserEntry.position,
            prevPos,
          );
        }
      } catch { /* silent */ }
    } catch (err) {
      try {
        await logAdminAction(admin, {
          userId,
          action: "league_recap_compute_failed",
          details: { groupId: league.group_id, error: String(err) },
        });
      } catch { /* silent */ }
      continue;
    }
  }

  return results;
}
