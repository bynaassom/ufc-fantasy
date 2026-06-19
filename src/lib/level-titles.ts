export const XP_PER_LEVEL = 500;

export function levelFromXp(xp: number): number {
  if (xp < 0) return 1;
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function titleFromLevel(level: number): string {
  if (level <= 1) return "Rookie";
  if (level === 2) return "Apprentice";
  if (level === 3) return "Strategist";
  if (level === 4) return "Veteran";
  if (level === 5) return "Expert";
  return "Legend";
}

export function xpForLevel(level: number): number {
  return (level - 1) * XP_PER_LEVEL;
}

export function xpToNextLevel(xp: number): { current: number; needed: number; progress: number } {
  const level = levelFromXp(xp);
  const currentLevelStart = xpForLevel(level);
  const nextLevelStart = xpForLevel(level + 1);
  const current = xp - currentLevelStart;
  const needed = nextLevelStart - xp;
  const progress = needed === 0 ? 1 : current / (nextLevelStart - currentLevelStart);
  return { current, needed, progress };
}
