import { describe, it, expect } from "vitest";
import {
  levelFromXp,
  titleFromLevel,
  xpForLevel,
  xpToNextLevel,
  XP_PER_LEVEL,
} from "@/lib/level-titles";

describe("level-titles", () => {
  it("levelFromXp returns 1 for negative or zero xp", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(-50)).toBe(1);
  });

  it("levelFromXp returns 1 below the first threshold", () => {
    expect(levelFromXp(XP_PER_LEVEL - 1)).toBe(1);
  });

  it("levelFromXp returns 2 at the first threshold", () => {
    expect(levelFromXp(XP_PER_LEVEL)).toBe(2);
  });

  it("levelFromXp returns 6 at 5 thresholds", () => {
    expect(levelFromXp(XP_PER_LEVEL * 5)).toBe(6);
  });

  it("titleFromLevel returns Rookie for level 1", () => {
    expect(titleFromLevel(1)).toBe("Rookie");
  });

  it("titleFromLevel returns Prospect for level 2", () => {
    expect(titleFromLevel(2)).toBe("Prospect");
  });

  it("titleFromLevel returns Contender for level 3", () => {
    expect(titleFromLevel(3)).toBe("Contender");
  });

  it("titleFromLevel returns Veteran for level 4", () => {
    expect(titleFromLevel(4)).toBe("Veteran");
  });

  it("titleFromLevel returns Champion for level 5", () => {
    expect(titleFromLevel(5)).toBe("Champion");
  });

  it("titleFromLevel returns Legend for level >= 6", () => {
    expect(titleFromLevel(6)).toBe("Legend");
    expect(titleFromLevel(99)).toBe("Legend");
  });

  it("xpForLevel returns 0 for level 1", () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it("xpForLevel returns 500 for level 2", () => {
    expect(xpForLevel(2)).toBe(500);
  });

  it("xpToNextLevel reports current/needed correctly at boundary", () => {
    const r = xpToNextLevel(XP_PER_LEVEL); // exactly level 2 start
    expect(r.current).toBe(0);
    expect(r.needed).toBe(XP_PER_LEVEL);
    expect(r.progress).toBe(0);
  });

  it("xpToNextLevel reports 50% at half a level", () => {
    const r = xpToNextLevel(XP_PER_LEVEL + XP_PER_LEVEL / 2);
    expect(r.progress).toBe(0.5);
  });
});
