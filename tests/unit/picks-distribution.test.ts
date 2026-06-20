import { describe, it, expect } from "vitest";

async function computeDistribution(
  picks: { picked_winner_id: string | null; fighter?: { name?: string | null } | null; picked_method?: string | null }[],
) {
  const winners = picks.filter((p) => p.picked_winner_id != null);
  const methods = picks.filter((p) => p.picked_method != null);

  const winnerMap = new Map<string, { name: string; count: number }>();
  for (const r of winners) {
    const id = r.picked_winner_id!;
    if (!winnerMap.has(id)) {
      winnerMap.set(id, { name: r.fighter?.name || "\u2014", count: 0 });
    }
    winnerMap.get(id)!.count++;
  }

  const methodMap = new Map<string, number>();
  for (const r of methods) {
    const m = r.picked_method!;
    methodMap.set(m, (methodMap.get(m) || 0) + 1);
  }

  const totalWinners = winners.length;
  const totalMethods = methods.length;

  return {
    winner_picks: Array.from(winnerMap.entries()).map(([id, v]) => ({
      fighterId: id,
      name: v.name,
      count: v.count,
      pct: totalWinners > 0 ? Math.round((v.count / totalWinners) * 100) : 0,
    })),
    method_picks: Array.from(methodMap.entries()).map(([method, count]) => ({
      method,
      count,
      pct: totalMethods > 0 ? Math.round((count / totalMethods) * 100) : 0,
    })),
  };
}

describe("pick distribution", () => {
  it("computes correct percentages from pick counts", async () => {
    const picks = [
      { picked_winner_id: "f1", fighter: { name: "Jones" }, picked_method: "knockout" },
      { picked_winner_id: "f1", fighter: { name: "Jones" }, picked_method: "knockout" },
      { picked_winner_id: "f1", fighter: { name: "Jones" }, picked_method: "submission" },
      { picked_winner_id: "f2", fighter: { name: "Gane" }, picked_method: "decision" },
    ];

    const result = await computeDistribution(picks);

    expect(result.winner_picks).toHaveLength(2);
    const jones = result.winner_picks.find((w) => w.fighterId === "f1")!;
    expect(jones.name).toBe("Jones");
    expect(jones.count).toBe(3);
    expect(jones.pct).toBe(75);

    const gane = result.winner_picks.find((w) => w.fighterId === "f2")!;
    expect(gane.name).toBe("Gane");
    expect(gane.count).toBe(1);
    expect(gane.pct).toBe(25);
  });

  it("returns empty arrays for zero picks", async () => {
    const result = await computeDistribution([]);

    expect(result.winner_picks).toEqual([]);
    expect(result.method_picks).toEqual([]);
  });

  it("handles missing fighter name gracefully", async () => {
    const picks = [
      { picked_winner_id: "f1", fighter: null, picked_method: "knockout" },
    ];

    const result = await computeDistribution(picks);

    expect(result.winner_picks).toHaveLength(1);
    expect(result.winner_picks[0].name).toBe("\u2014");
    expect(result.winner_picks[0].pct).toBe(100);

    expect(result.method_picks).toHaveLength(1);
    expect(result.method_picks[0].method).toBe("knockout");
    expect(result.method_picks[0].count).toBe(1);
    expect(result.method_picks[0].pct).toBe(100);
  });
});
