export type PlayerLevel = {
  label: string;
  minPoints: number;
  nextMinPoints?: number;
};

const PLAYER_LEVELS: PlayerLevel[] = [
  { label: "Prospect", minPoints: 0, nextMinPoints: 100 },
  { label: "Contender", minPoints: 100, nextMinPoints: 300 },
  { label: "Ranked", minPoints: 300, nextMinPoints: 600 },
  { label: "Main Carder", minPoints: 600, nextMinPoints: 1000 },
  { label: "Champion", minPoints: 1000, nextMinPoints: 1500 },
  { label: "Hall of Famer", minPoints: 1500 },
];

const PLAYER_LEVELS_DESC = [...PLAYER_LEVELS].reverse();

export function getPlayerLevel(points?: number | null): PlayerLevel {
  const safePoints = Math.max(0, Number(points || 0));
  return PLAYER_LEVELS_DESC.find((level) => safePoints >= level.minPoints) || PLAYER_LEVELS[0];
}

export function getPlayerLevelProgress(points?: number | null) {
  const safePoints = Math.max(0, Number(points || 0));
  const level = getPlayerLevel(safePoints);

  if (!level.nextMinPoints) {
    return { level, progress: 100, pointsToNext: 0 };
  }

  const range = level.nextMinPoints - level.minPoints;
  const progress = Math.min(100, Math.max(0, ((safePoints - level.minPoints) / range) * 100));

  return {
    level,
    progress,
    pointsToNext: Math.max(0, level.nextMinPoints - safePoints),
  };
}
