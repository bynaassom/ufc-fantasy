import { describe, expect, it } from "vitest";
import { buildChallengeSuggestions } from "@/lib/challenge-suggestions";

describe("buildChallengeSuggestions", () => {
  it("prioriza o rival imediatamente acima e exclui pares ativos", () => {
    const result = buildChallengeSuggestions([
      { userId: "me", nickname: "me", rankPosition: 10 },
      { userId: "one", nickname: "one", rankPosition: 9 },
      { userId: "two", nickname: "two", rankPosition: 8 },
      { userId: "three", nickname: "three", rankPosition: 12, lastEventPoints: 11 },
    ], { currentUserId: "me", currentRankPosition: 10, excludedUserIds: ["one"] });
    expect(result.map((item) => item.userId)).toEqual(["two", "three"]);
    expect(result[0].reason).toBe("2 posições à sua frente");
  });

  it("usa pontuação semelhante como fallback determinístico", () => {
    const result = buildChallengeSuggestions([
      { userId: "b", nickname: "b", lastEventPoints: 31, rankPosition: 2 },
      { userId: "a", nickname: "a", lastEventPoints: 30, rankPosition: 3 },
      { userId: "c", nickname: "c", lastEventPoints: 50, rankPosition: 1 },
    ], { currentUserId: "me", currentLastEventPoints: 30, max: 2 });
    expect(result.map((item) => item.userId)).toEqual(["a", "b"]);
    expect(result[0].reason).toBe("mesma pontuação no último evento");
  });
});
