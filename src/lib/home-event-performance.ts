import type { EventScore, Pick as FantasyPick, PreviousEventPerformance } from "@/types";

type ScoreRow = Pick<EventScore, "event_id" | "total_points" | "rank_position" | "perfect_picks"> & {
  user_id?: string;
};

type HomePickRow = Pick<FantasyPick, "event_id" | "points_winner" | "total_points">;

export function buildPreviousEventPerformance(
  eventId: string,
  score: ScoreRow | null | undefined,
  picks: HomePickRow[],
): PreviousEventPerformance {
  const participated = Boolean(score) || picks.length > 0;
  return {
    eventId,
    participated,
    totalPoints: participated ? score?.total_points ?? null : null,
    rankPosition: participated ? score?.rank_position ?? null : null,
    correctWinners: participated
      ? picks.filter((pick) => Number(pick.points_winner) > 0).length
      : null,
    perfectPicks: participated ? score?.perfect_picks ?? null : null,
  };
}

export function buildPreviousEventPerformances(
  eventIds: string[],
  scores: ScoreRow[],
  picks: HomePickRow[],
) {
  const scoreByEvent = new Map(scores.map((score) => [score.event_id, score]));
  const picksByEvent = new Map<string, HomePickRow[]>();
  for (const pick of picks) {
    const eventPicks = picksByEvent.get(pick.event_id) ?? [];
    eventPicks.push(pick);
    picksByEvent.set(pick.event_id, eventPicks);
  }

  return eventIds.map((eventId) =>
    buildPreviousEventPerformance(
      eventId,
      scoreByEvent.get(eventId),
      picksByEvent.get(eventId) ?? [],
    ),
  );
}
