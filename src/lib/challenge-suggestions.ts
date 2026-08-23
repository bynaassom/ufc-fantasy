import type { SuggestedRival } from "@/types";

export type ChallengeSuggestionCandidate = {
  userId: string;
  nickname: string;
  displayName?: string;
  rankPosition?: number | null;
  totalPoints?: number | null;
  lastEventPoints?: number | null;
  isBanned?: boolean;
  isPublic?: boolean;
};

export type ChallengeSuggestionOptions = {
  currentUserId: string;
  currentRankPosition?: number | null;
  currentLastEventPoints?: number | null;
  excludedUserIds?: string[];
  max?: number;
};

function differenceLabel(value: number) {
  return `${value} ponto${value === 1 ? "" : "s"} de diferença no último evento`;
}

/**
 * Keeps rival discovery deterministic and independent of Supabase. The first
 * pass favours the closest ranked player above the user; the second pass fills
 * remaining slots with similar last-event scores.
 */
export function buildChallengeSuggestions(
  candidates: ChallengeSuggestionCandidate[],
  options: ChallengeSuggestionOptions,
): SuggestedRival[] {
  const max = Math.max(0, options.max ?? 3);
  const excluded = new Set(options.excludedUserIds ?? []);
  const eligible = candidates.filter(
    (candidate) =>
      candidate.userId !== options.currentUserId &&
      !excluded.has(candidate.userId) &&
      candidate.isBanned !== true &&
      candidate.isPublic !== false,
  );

  const rankedAbove = options.currentRankPosition
    ? eligible
        .filter(
          (candidate) =>
            candidate.rankPosition != null &&
            candidate.rankPosition < options.currentRankPosition!,
        )
        .sort((a, b) => {
          const rankDistanceA = options.currentRankPosition! - (a.rankPosition ?? 0);
          const rankDistanceB = options.currentRankPosition! - (b.rankPosition ?? 0);
          return rankDistanceA - rankDistanceB || a.userId.localeCompare(b.userId);
        })
    : [];

  const selected: ChallengeSuggestionCandidate[] = [];
  const selectedIds = new Set<string>();

  for (const candidate of rankedAbove) {
    if (selected.length >= max) break;
    selected.push(candidate);
    selectedIds.add(candidate.userId);
  }

  const byScore = eligible
    .filter((candidate) => !selectedIds.has(candidate.userId))
    .filter((candidate) => candidate.lastEventPoints != null)
    .sort((a, b) => {
      const currentPoints = options.currentLastEventPoints;
      if (currentPoints == null) {
        return (a.rankPosition ?? Number.MAX_SAFE_INTEGER) -
          (b.rankPosition ?? Number.MAX_SAFE_INTEGER) ||
          a.userId.localeCompare(b.userId);
      }

      const differenceA = Math.abs((a.lastEventPoints ?? 0) - currentPoints);
      const differenceB = Math.abs((b.lastEventPoints ?? 0) - currentPoints);
      return differenceA - differenceB ||
        (a.rankPosition ?? Number.MAX_SAFE_INTEGER) -
          (b.rankPosition ?? Number.MAX_SAFE_INTEGER) ||
        a.userId.localeCompare(b.userId);
    });

  for (const candidate of byScore) {
    if (selected.length >= max) break;
    selected.push(candidate);
    selectedIds.add(candidate.userId);
  }

  return selected.map((candidate) => {
    let reason = "Rival em destaque no ranking";
    if (
      options.currentRankPosition &&
      candidate.rankPosition &&
      candidate.rankPosition < options.currentRankPosition
    ) {
      const distance = options.currentRankPosition - candidate.rankPosition;
      reason = distance === 1
        ? "1 posição à sua frente"
        : `${distance} posições à sua frente`;
    } else if (
      options.currentLastEventPoints != null &&
      candidate.lastEventPoints != null
    ) {
      const difference = Math.abs(
        candidate.lastEventPoints - options.currentLastEventPoints,
      );
      reason = difference === 0 ? "mesma pontuação no último evento" : differenceLabel(difference);
    }

    return {
      userId: candidate.userId,
      nickname: candidate.nickname,
      displayName: candidate.displayName || candidate.nickname,
      reason,
      rankPosition: candidate.rankPosition ?? null,
      lastEventPoints: candidate.lastEventPoints ?? null,
    };
  });
}
