import { describe, expect, it } from "vitest";
import { buildPreviousEventPerformance } from "@/lib/home-event-performance";

describe("buildPreviousEventPerformance", () => {
  it("conta acertos por points_winner e preserva zeros de participação", () => {
    expect(buildPreviousEventPerformance("event", { event_id: "event", total_points: 0, rank_position: 41, perfect_picks: 0 }, [
      { event_id: "event", points_winner: 1, total_points: 1 },
      { event_id: "event", points_winner: 0, total_points: 0 },
    ])).toMatchObject({ participated: true, totalPoints: 0, rankPosition: 41, correctWinners: 1, perfectPicks: 0 });
  });

  it("distingue ausência de participação de zero pontos", () => {
    expect(buildPreviousEventPerformance("event", null, [])).toEqual({ eventId: "event", participated: false, totalPoints: null, rankPosition: null, correctWinners: null, perfectPicks: null });
  });
});
