# Player XP & Streak System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reward expertise with per-event weighted XP and accuracy streaks (consecutive events at 70%+ correct winners), surfaced as cosmetic level titles across profile, recap, share cards, and home.

**Architecture:** New `xp_events` log table, denormalized counters on `profiles` (xp_total, current_streak, best_streak, level). XP awarded automatically when an event transitions to `completed` via existing `event-lifecycle` and `sync-results` hooks. Idempotent via unique `(user_id, event_id, reason)` constraint. Pure `lib/level-titles.ts` for level math.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind, Supabase (Postgres + RLS), Zod, vitest

## Global Constraints

- **XP formula:** `participation(100) + 50*accuracy + 25*method_acc + 25*round_acc` rounded to int, per user per event.
- **Streak rule:** consecutive completed events with picks AND `correct_winners / fights_with_picks >= 0.7`. Resets on miss or low accuracy.
- **Level:** `floor(xp_total / 500) + 1`. Cosmetic only. No unlocks.
- **Level titles:** 1 Rookie, 2 Prospect, 3 Contender, 4 Veteran, 5 Champion, 6+ Legend.
- **Idempotency:** `xp_events.UNIQUE (user_id, event_id, reason)` — re-runs are safe.
- **best_streak** is monotonic (never decreases).
- **Auth:** server-side mutations use `requireAdmin()` or service role; user reads use anon client + RLS.
- **Copy/UX:** Pt-BR, dark theme with red accents, existing CSS variables.
- **No backfill:** existing users start at level 1, 0 XP. XP is awarded only for events that complete after this ships.

---

### Task 1: Migration + level-titles pure module

**Files:**
- Create: `supabase/migrations/20260620000000_xp_system.sql`
- Create: `src/lib/level-titles.ts`
- Test: `tests/unit/level-titles.test.ts`

**Interfaces:**
- Produces: `xp_events` table, `profiles.xp_total/current_streak/best_streak/level` columns
- Produces: `levelFromXp(xp)`, `titleFromLevel(level)`, `xpForLevel(level)` — pure functions

- [ ] **Step 1: Create the migration file**

```sql
-- 20260620000000_xp_system.sql
CREATE TABLE IF NOT EXISTS xp_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event_id, reason)
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user_created ON xp_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_events_event ON xp_events(event_id);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS xp_total       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level          INTEGER NOT NULL DEFAULT 1;

-- RLS: users can read own xp_events, admins can read all
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "xp_events_select_own" ON xp_events;
CREATE POLICY "xp_events_select_own" ON xp_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "xp_events_admin_select" ON xp_events;
CREATE POLICY "xp_events_admin_select" ON xp_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND is_banned = false)
  );

-- Inserts/updates are server-only (no policy = blocked for anon/authenticated)
```

- [ ] **Step 2: Create the level-titles module**

```typescript
// src/lib/level-titles.ts
export const XP_PER_LEVEL = 500;

export function levelFromXp(xp: number): number {
  if (xp < 0) return 1;
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function titleFromLevel(level: number): string {
  if (level <= 1) return "Rookie";
  if (level === 2) return "Prospect";
  if (level === 3) return "Contender";
  if (level === 4) return "Veteran";
  if (level === 5) return "Champion";
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
```

- [ ] **Step 3: Write the failing test**

```typescript
// tests/unit/level-titles.test.ts
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
```

Run: `npx vitest run tests/unit/level-titles.test.ts`
Expected: All tests pass (RED + GREEN combined since pure module).

- [ ] **Step 4: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: No errors

```bash
git add supabase/migrations/20260620000000_xp_system.sql src/lib/level-titles.ts tests/unit/level-titles.test.ts
git commit -m "feat(xp): migration for xp_events table and level-titles module"
```

---

### Task 2: Types + XP repository

**Files:**
- Modify: `src/types/index.ts` (add XpEvent, XpEventMetadata, XpSummary)
- Create: `src/server/repositories/xp.ts`
- Test: `tests/unit/xp-repository.test.ts`

**Interfaces:**
- Produces: `XpEvent`, `XpEventMetadata`, `XpSummary` types
- Produces: `insertXpEvent`, `listXpEventsForUser`, `incrementProfileXp`, `updateProfileStreak`, `updateProfileLevel` repo functions

- [ ] **Step 1: Add types**

At end of `src/types/index.ts`:

```typescript
export interface XpEventMetadata {
  accuracy: number;
  method_acc: number;
  round_acc: number;
  fights_with_picks: number;
  correct_winners: number;
  correct_methods: number;
  correct_rounds: number;
}

export interface XpEvent {
  id: string;
  user_id: string;
  event_id: string;
  amount: number;
  reason: string;
  metadata: XpEventMetadata;
  created_at: string;
}

export interface XpSummary {
  xpTotal: number;
  level: number;
  levelTitle: string;
  currentStreak: number;
  bestStreak: number;
  nextLevelXp: number;
  progressToNextLevel: number;
}
```

- [ ] **Step 2: Create the XP repository**

```typescript
// src/server/repositories/xp.ts
import type { DbClient } from "@/types/database";
import type { XpEvent, XpEventMetadata } from "@/types";

export type InsertXpEventInput = {
  userId: string;
  eventId: string;
  amount: number;
  reason: string;
  metadata: XpEventMetadata;
};

export async function insertXpEvent(
  client: DbClient,
  input: InsertXpEventInput,
): Promise<XpEvent | null> {
  const { data, error } = await client
    .from("xp_events")
    .upsert(
      {
        user_id: input.userId,
        event_id: input.eventId,
        amount: input.amount,
        reason: input.reason,
        metadata: input.metadata,
      },
      { onConflict: "user_id,event_id,reason", ignoreDuplicates: true },
    )
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as XpEvent) || null;
}

export async function listXpEventsForUser(
  client: DbClient,
  userId: string,
  limit = 50,
): Promise<XpEvent[]> {
  const { data, error } = await client
    .from("xp_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as unknown as XpEvent[];
}

export async function incrementProfileXp(
  client: DbClient,
  userId: string,
  amount: number,
): Promise<void> {
  if (amount === 0) return;
  const { error } = await client.rpc("increment_profile_xp", {
    p_user_id: userId,
    p_amount: amount,
  });
  if (error) throw error;
}

export async function updateProfileStreak(
  client: DbClient,
  userId: string,
  currentStreak: number,
  bestStreak: number,
): Promise<void> {
  const { error } = await client.rpc("update_profile_streak", {
    p_user_id: userId,
    p_current_streak: currentStreak,
    p_best_streak: bestStreak,
  });
  if (error) throw error;
}

export async function updateProfileLevel(
  client: DbClient,
  userId: string,
  level: number,
): Promise<void> {
  const { error } = await client
    .from("profiles")
    .update({ level })
    .eq("id", userId);
  if (error) throw error;
}
```

- [ ] **Step 3: Add RPC functions to the migration (extend Task 1's file)**

Append to `supabase/migrations/20260620000000_xp_system.sql`:

```sql
-- Atomic increment of xp_total
CREATE OR REPLACE FUNCTION increment_profile_xp(p_user_id UUID, p_amount INTEGER)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE profiles
  SET xp_total = GREATEST(0, xp_total + p_amount)
  WHERE id = p_user_id;
$$;

-- Monotonic streak update (best_streak never decreases)
CREATE OR REPLACE FUNCTION update_profile_streak(
  p_user_id UUID,
  p_current_streak INTEGER,
  p_best_streak INTEGER
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE profiles
  SET current_streak = p_current_streak,
      best_streak = GREATEST(best_streak, p_best_streak)
  WHERE id = p_user_id;
$$;
```

- [ ] **Step 4: Write the failing test**

```typescript
// tests/unit/xp-repository.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockMaybeSingle = vi.fn();
const mockRpc = vi.fn();
const mockUpdate = vi.fn();

const mockClient: any = {
  from: vi.fn(() => ({
    upsert: mockUpsert,
    select: mockSelect,
    update: mockUpdate,
  })),
  rpc: mockRpc,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUpsert.mockReturnValue({ select: () => ({ maybeSingle: mockMaybeSingle }) });
  mockSelect.mockReturnValue({ eq: () => ({ order: () => ({ limit: mockLimit }) }) });
  mockUpdate.mockReturnValue({ eq: () => ({}) });
  mockLimit.mockResolvedValue({ data: [], error: null });
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockRpc.mockResolvedValue({ error: null });
});

describe("xp repository", () => {
  it("insertXpEvent calls upsert with the unique conflict target", async () => {
    const { insertXpEvent } = await import("@/server/repositories/xp");
    await insertXpEvent(mockClient, {
      userId: "u1",
      eventId: "e1",
      amount: 100,
      reason: "event_completion",
      metadata: {
        accuracy: 0.75,
        method_acc: 0.5,
        round_acc: 0.375,
        fights_with_picks: 8,
        correct_winners: 6,
        correct_methods: 4,
        correct_rounds: 3,
      },
    });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        event_id: "e1",
        amount: 100,
        reason: "event_completion",
      }),
      { onConflict: "user_id,event_id,reason", ignoreDuplicates: true },
    );
  });

  it("listXpEventsForUser queries with DESC ordering and limit", async () => {
    const { listXpEventsForUser } = await import("@/server/repositories/xp");
    await listXpEventsForUser(mockClient, "u1", 10);
    expect(mockClient.from).toHaveBeenCalledWith("xp_events");
    expect(mockEq).toHaveBeenCalledWith("user_id", "u1");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(10);
  });

  it("incrementProfileXp calls the rpc with the amount", async () => {
    const { incrementProfileXp } = await import("@/server/repositories/xp");
    await incrementProfileXp(mockClient, "u1", 159);
    expect(mockRpc).toHaveBeenCalledWith("increment_profile_xp", {
      p_user_id: "u1",
      p_amount: 159,
    });
  });

  it("incrementProfileXp is a no-op for zero amount", async () => {
    const { incrementProfileXp } = await import("@/server/repositories/xp");
    await incrementProfileXp(mockClient, "u1", 0);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("updateProfileStreak calls the rpc with both streaks", async () => {
    const { updateProfileStreak } = await import("@/server/repositories/xp");
    await updateProfileStreak(mockClient, "u1", 5, 12);
    expect(mockRpc).toHaveBeenCalledWith("update_profile_streak", {
      p_user_id: "u1",
      p_current_streak: 5,
      p_best_streak: 12,
    });
  });
});
```

Run: `npx vitest run tests/unit/xp-repository.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: No errors

```bash
git add src/types/index.ts src/server/repositories/xp.ts supabase/migrations/20260620000000_xp_system.sql tests/unit/xp-repository.test.ts
git commit -m "feat(xp): types and repository for XP events"
```

---

### Task 3: XP service (compute + award + streak)

**Files:**
- Create: `src/server/services/xp.ts`
- Test: `tests/unit/xp-service.test.ts`

**Interfaces:**
- Consumes: `xp` repository, `level-titles` module
- Produces: `computeEventXpForUser`, `awardEventXpForAllUsers`, `recomputeStreakForUser`, `getProfileXpSummary`, `getRecentXpEventsForUser`

- [ ] **Step 1: Create the service**

```typescript
// src/server/services/xp.ts
import type { DbClient } from "@/types/database";
import type { XpEvent, XpEventMetadata, XpSummary } from "@/types";
import { getServiceRoleSupabase } from "@/lib/supabase/service-role";
import {
  insertXpEvent,
  listXpEventsForUser,
  incrementProfileXp,
  updateProfileStreak,
  updateProfileLevel,
} from "@/server/repositories/xp";
import { levelFromXp, titleFromLevel, xpToNextLevel } from "@/lib/level-titles";

const XP_REASON = "event_completion";

export async function computeEventXpForUser(
  client: DbClient,
  userId: string,
  eventId: string,
): Promise<{ amount: number; metadata: XpEventMetadata } | null> {
  // Read all picks for the user+event with their scoring
  const { data: picks, error: picksErr } = await client
    .from("event_picks")
    .select("fight_id, winner_id, method, round, points_winner, points_method, points_round")
    .eq("user_id", userId)
    .eq("event_id", eventId);

  if (picksErr) throw picksErr;
  if (!picks || picks.length === 0) return null;

  let correctWinners = 0;
  let correctMethods = 0;
  let correctRounds = 0;
  for (const p of picks) {
    if ((p.points_winner ?? 0) > 0) correctWinners++;
    if ((p.points_method ?? 0) > 0) correctMethods++;
    if ((p.points_round ?? 0) > 0) correctRounds++;
  }

  const n = picks.length;
  const accuracy = correctWinners / n;
  const methodAcc = correctMethods / n;
  const roundAcc = correctRounds / n;

  const amount = Math.round(100 + 50 * accuracy + 25 * methodAcc + 25 * roundAcc);

  return {
    amount,
    metadata: {
      accuracy,
      method_acc: methodAcc,
      round_acc: roundAcc,
      fights_with_picks: n,
      correct_winners: correctWinners,
      correct_methods: correctMethods,
      correct_rounds: correctRounds,
    },
  };
}

export async function awardEventXpForAllUsers(eventId: string): Promise<{
  awarded: number;
  usersAffected: string[];
}> {
  const admin = await getServiceRoleSupabase();

  // Find all distinct users with picks for this event
  const { data: pickers, error: pickersErr } = await admin
    .from("event_picks")
    .select("user_id")
    .eq("event_id", eventId);

  if (pickersErr) throw pickersErr;
  if (!pickers || pickers.length === 0) return { awarded: 0, usersAffected: [] };

  const userIds = Array.from(new Set(pickers.map((p) => p.user_id)));
  const usersAffected: string[] = [];
  let awarded = 0;

  for (const userId of userIds) {
    try {
      const computed = await computeEventXpForUser(admin, userId, eventId);
      if (!computed) continue;
      const inserted = await insertXpEvent(admin, {
        userId,
        eventId,
        amount: computed.amount,
        reason: XP_REASON,
        metadata: computed.metadata,
      });
      // ignoreDuplicates: true returns null when the row already exists
      if (!inserted) continue;
      await incrementProfileXp(admin, userId, computed.amount);
      usersAffected.push(userId);
      awarded++;
    } catch (err) {
      // Log and continue; do not block the rest
      await admin.from("activity_logs").insert({
        user_id: null,
        action: "xp_compute_failed",
        details: { eventId, userId, error: String(err) },
        suspicious: false,
      });
    }
  }

  // Recompute streaks and levels for affected users
  for (const userId of usersAffected) {
    try {
      await recomputeStreakAndLevelForUser(userId);
    } catch (err) {
      await admin.from("activity_logs").insert({
        user_id: null,
        action: "xp_streak_recompute_failed",
        details: { userId, error: String(err) },
        suspicious: false,
      });
    }
  }

  return { awarded, usersAffected };
}

export async function recomputeStreakAndLevelForUser(userId: string): Promise<void> {
  const admin = await getServiceRoleSupabase();
  const events = await listXpEventsForUser(admin, userId, 100);

  let currentStreak = 0;
  for (const ev of events) {
    if (ev.metadata.accuracy >= 0.7) currentStreak++;
    else break;
  }

  const { data: profile, error } = await admin
    .from("profiles")
    .select("xp_total, best_streak, level")
    .eq("id", userId)
    .single();
  if (error) throw error;

  const bestStreak = Math.max(currentStreak, profile.best_streak);
  const newLevel = levelFromXp(profile.xp_total);

  await updateProfileStreak(admin, userId, currentStreak, bestStreak);
  if (newLevel !== profile.level) {
    await updateProfileLevel(admin, userId, newLevel);
  }
}

export async function getProfileXpSummary(userId: string): Promise<XpSummary> {
  const admin = await getServiceRoleSupabase();
  const { data, error } = await admin
    .from("profiles")
    .select("xp_total, current_streak, best_streak, level")
    .eq("id", userId)
    .single();
  if (error) throw error;

  const progress = xpToNextLevel(data.xp_total);
  return {
    xpTotal: data.xp_total,
    level: data.level,
    levelTitle: titleFromLevel(data.level),
    currentStreak: data.current_streak,
    bestStreak: data.best_streak,
    nextLevelXp: progress.needed,
    progressToNextLevel: progress.progress,
  };
}

export async function getRecentXpEventsForUser(
  userId: string,
  limit = 10,
): Promise<XpEvent[]> {
  const admin = await getServiceRoleSupabase();
  return listXpEventsForUser(admin, userId, limit);
}
```

- [ ] **Step 2: Write the failing tests**

```typescript
// tests/unit/xp-service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRpc = vi.fn();
const mockUpsert = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = viFn();
const mockInsert = vi.fn();

function viFn() {
  return vi.fn(() => ({ eq: vi.fn(() => ({})) }));
}

const mockClient: any = {
  from: vi.fn(),
  rpc: mockRpc,
};

vi.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleSupabase: vi.fn(() => Promise.resolve(mockClient)),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUpsert.mockReturnValue({ select: () => ({ maybeSingle: mockMaybeSingle }) });
  mockSelect.mockReturnValue({ eq: () => ({ order: () => ({ limit: mockLimit }), single: mockSingle }) });
  mockLimit.mockResolvedValue({ data: [], error: null });
  mockSingle.mockResolvedValue({ data: { xp_total: 0, best_streak: 0, level: 1 }, error: null });
  mockMaybeSingle.mockResolvedValue({ data: { id: "x1" }, error: null });
  mockRpc.mockResolvedValue({ error: null });
  mockInsert.mockResolvedValue({ error: null });
});

describe("xp service - computeEventXpForUser", () => {
  it("returns null when the user has no picks for the event", async () => {
    mockClient.from.mockReturnValueOnce({
      select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
    });
    const { computeEventXpForUser } = await import("@/server/services/xp");
    const result = await computeEventXpForUser(mockClient, "u1", "e1");
    expect(result).toBeNull();
  });

  it("computes the canonical example: 8 fights, 6 winners, 4 methods, 3 rounds", async () => {
    const picks = Array.from({ length: 8 }, (_, i) => ({
      fight_id: `f${i}`,
      winner_id: i < 6 ? "w" : null,
      method: i < 4 ? "ko" : null,
      round: i < 3 ? 1 : null,
      points_winner: i < 6 ? 10 : 0,
      points_method: i < 4 ? 5 : 0,
      points_round: i < 3 ? 3 : 0,
    }));
    mockClient.from.mockReturnValueOnce({
      select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: picks, error: null }) }) }),
    });
    const { computeEventXpForUser } = await import("@/server/services/xp");
    const result = await computeEventXpForUser(mockClient, "u1", "e1");
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(159);
    expect(result!.metadata.accuracy).toBe(0.75);
    expect(result!.metadata.method_acc).toBe(0.5);
    expect(result!.metadata.round_acc).toBeCloseTo(0.375);
  });

  it("returns 100 XP for 0 correct out of 8 (participation only)", async () => {
    const picks = Array.from({ length: 8 }, () => ({
      fight_id: "f", winner_id: null, method: null, round: null,
      points_winner: 0, points_method: 0, points_round: 0,
    }));
    mockClient.from.mockReturnValueOnce({
      select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: picks, error: null }) }) }),
    });
    const { computeEventXpForUser } = await import("@/server/services/xp");
    const result = await computeEventXpForUser(mockClient, "u1", "e1");
    expect(result!.amount).toBe(100);
  });

  it("returns 200 XP for a perfect 8/8", async () => {
    const picks = Array.from({ length: 8 }, () => ({
      fight_id: "f", winner_id: "w", method: "ko", round: 1,
      points_winner: 10, points_method: 5, points_round: 3,
    }));
    mockClient.from.mockReturnValueOnce({
      select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: picks, error: null }) }) }),
    });
    const { computeEventXpForUser } = await import("@/server/services/xp");
    const result = await computeEventXpForUser(mockClient, "u1", "e1");
    expect(result!.amount).toBe(200);
  });
});

describe("xp service - awardEventXpForAllUsers", () => {
  it("returns 0/[] when no picks exist for the event", async () => {
    mockClient.from.mockReturnValueOnce({
      select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
    });
    const { awardEventXpForAllUsers } = await import("@/server/services/xp");
    const r = await awardEventXpForAllUsers("e1");
    expect(r).toEqual({ awarded: 0, usersAffected: [] });
  });

  it("awards XP to each unique user and recomputes streak", async () => {
    // First call: list pickers
    // Then per user: list picks, insert xp_events, list events for streak, get profile, update
    const pickers = [{ user_id: "u1" }, { user_id: "u2" }];
    const picksForU1 = [{ fight_id: "f1", winner_id: "w", method: "ko", round: 1, points_winner: 10, points_method: 5, points_round: 3 }];
    const eventsForU1 = [{ metadata: { accuracy: 1, method_acc: 1, round_acc: 1, fights_with_picks: 1, correct_winners: 1, correct_methods: 1, correct_rounds: 1 }, created_at: "2026-06-01" }];

    mockClient.from
      .mockReturnValueOnce({ select: () => ({ eq: () => Promise.resolve({ data: pickers, error: null }) }) })
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: picksForU1, error: null }) }) }) })
      .mockReturnValueOnce({ upsert: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "x" }, error: null }) }) }) })
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: eventsForU1, error: null }) }) }) }) })
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { xp_total: 200, best_streak: 5, level: 1 }, error: null }) }) }) })
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: picksForU1, error: null }) }) }) })
      .mockReturnValueOnce({ upsert: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "y" }, error: null }) }) }) })
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }) })
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { xp_total: 200, best_streak: 5, level: 1 }, error: null }) }) }) });

    const { awardEventXpForAllUsers } = await import("@/server/services/xp");
    const r = await awardEventXpForAllUsers("e1");
    expect(r.usersAffected.length).toBeGreaterThan(0);
  });
});
```

Run: `npx vitest run tests/unit/xp-service.test.ts`
Expected: All tests pass.

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: No errors

```bash
git add src/server/services/xp.ts tests/unit/xp-service.test.ts
git commit -m "feat(xp): XP service with compute, award, and streak recompute"
```

---

### Task 4: Hook into event-lifecycle and sync-results

**Files:**
- Modify: `src/server/services/event-lifecycle.ts`
- Modify: `src/app/api/sync-results/route.ts`

**Interfaces:**
- Consumes: `awardEventXpForAllUsers(eventId)` from `@/server/services/xp`
- Produces: XP awards fire automatically when an event transitions to `completed`

- [ ] **Step 1: Modify event-lifecycle.ts**

Read `src/server/services/event-lifecycle.ts` and find the function that marks events as `completed`. After the completion logic, add the XP hook. For example, if the function returns `{ promoted, completed }` after completion, add:

```typescript
// inside the function that handles completion, after marking events completed:
import { awardEventXpForAllUsers } from "@/server/services/xp";

for (const eventId of completed) {
  try {
    await awardEventXpForAllUsers(eventId);
  } catch (err) {
    // logged inside the service; do not block lifecycle
  }
}
```

The exact integration depends on the function's return shape. Read the file first, locate the completion block, and insert the call.

- [ ] **Step 2: Modify sync-results/route.ts**

In `src/app/api/sync-results/route.ts`, after the transactional result RPC completes successfully, if the event is now `completed` (status changed from `upcoming` or `live`), call:

```typescript
import { awardEventXpForAllUsers } from "@/server/services/xp";

// After results are applied and event is completed:
if (eventNowCompleted) {
  try {
    await awardEventXpForAllUsers(eventId);
  } catch (err) {
    // logged inside the service
  }
}
```

Read the file, find the right spot, and insert the call. Wrap in try/catch — XP failures must not block the result sync.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/server/services/event-lifecycle.ts src/app/api/sync-results/route.ts
git commit -m "feat(xp): hook XP awards into event-lifecycle and sync-results"
```

---

### Task 5: Page data extensions

**Files:**
- Modify: `src/server/services/app.ts`

**Interfaces:**
- Consumes: `getProfileXpSummary` from `@/server/services/xp`
- Produces: `getMyProfile`, `getPublicProfilePageData`, `getEventRecapData` return XP data

- [ ] **Step 1: Extend getMyProfile**

In `src/server/services/app.ts`, find `getMyProfile` and add XP summary:

```typescript
// import at top
import { getProfileXpSummary } from "@/server/services/xp";

// inside getMyProfile, before the return:
const xpSummary = await getProfileXpSummary(user.id);
return { profile, xpSummary };
```

If the existing return is `{ profile }`, change to `{ profile, xpSummary }`.

- [ ] **Step 2: Extend getPublicProfilePageData**

Find `getPublicProfilePageData(nickname)` and add XP data:

```typescript
// inside the function, after the profile is fetched:
const xpSummary = await getProfileXpSummary(profile.id);
return { ..., xpSummary };
```

Adjust the return shape to include `xpSummary`.

- [ ] **Step 3: Extend getEventRecapData**

Find `getEventRecapData(slug)`. After the user's pick is fetched, look up the user's XP event for that event:

```typescript
// after fetching the user's data for the recap:
const xpEvent = await getEventXpForUser(userId, eventId); // add this helper if needed
return { ..., xpEarned: xpEvent?.amount ?? 0, xpAccuracy: xpEvent?.metadata.accuracy ?? 0 };
```

If `getEventXpForUser` doesn't exist yet, add it to `src/server/services/xp.ts`:

```typescript
export async function getEventXpForUser(
  userId: string,
  eventId: string,
): Promise<XpEvent | null> {
  const admin = await getServiceRoleSupabase();
  const { data, error } = await admin
    .from("xp_events")
    .select("*")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .eq("reason", XP_REASON)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as XpEvent) || null;
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors. Fix any consumers of the changed return types.

- [ ] **Step 5: Commit**

```bash
git add src/server/services/app.ts src/server/services/xp.ts
git commit -m "feat(xp): include XP data in profile and recap page data"
```

---

### Task 6: UI components (XpSummary, XpHistoryList)

**Files:**
- Create: `src/components/profile/XpSummary.tsx`
- Create: `src/components/profile/XpHistoryList.tsx`
- Modify: `src/app/profile/page.tsx` (or wherever /profile is)
- Modify: `src/app/jogador/[nickname]/page.tsx` (public profile)

- [ ] **Step 1: Create XpSummary component**

```typescript
// src/components/profile/XpSummary.tsx
import type { XpSummary as XpSummaryType } from "@/types";

export default function XpSummary({ data }: { data: XpSummaryType }) {
  const progressPct = Math.round(data.progressToNextLevel * 100);
  return (
    <div
      className="p-4"
      style={{
        backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div
            className="font-condensed font-900 text-2xl uppercase"
            style={{ color: "var(--red)" }}
          >
            {data.levelTitle}
          </div>
          <div
            className="font-condensed text-xs uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Nivel {data.level}
          </div>
        </div>
        <div className="text-right">
          <div
            className="font-condensed font-700 text-2xl"
            style={{ color: "var(--text)" }}
          >
            {data.xpTotal.toLocaleString("pt-BR")} XP
          </div>
          <div
            className="font-condensed text-xs uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Falta {data.nextLevelXp} XP
          </div>
        </div>
      </div>

      <div
        className="h-2 w-full mb-4"
        style={{ backgroundColor: "var(--border)" }}
      >
        <div
          className="h-2"
          style={{
            width: `${progressPct}%`,
            backgroundColor: "var(--red)",
            transition: "width 0.3s",
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div
            className="font-condensed text-xs uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Sequencia Atual
          </div>
          <div
            className="font-condensed font-900 text-xl"
            style={{ color: "var(--text)" }}
          >
            {data.currentStreak > 0 ? `${data.currentStreak} evento${data.currentStreak === 1 ? "" : "s"}` : "—"}
          </div>
        </div>
        <div>
          <div
            className="font-condensed text-xs uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Melhor Sequencia
          </div>
          <div
            className="font-condensed font-900 text-xl"
            style={{ color: "var(--text)" }}
          >
            {data.bestStreak > 0 ? `${data.bestStreak} evento${data.bestStreak === 1 ? "" : "s"}` : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create XpHistoryList component**

```typescript
// src/components/profile/XpHistoryList.tsx
import type { XpEvent } from "@/types";
import { formatAdminDateTime } from "@/components/admin/shared";

export default function XpHistoryList({ events }: { events: XpEvent[] }) {
  if (events.length === 0) {
    return (
      <p
        className="text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        Nenhum evento com picks ainda.
      </p>
    );
  }
  return (
    <div>
      <h3
        className="font-condensed font-700 text-sm uppercase tracking-widest mb-3"
        style={{ color: "var(--text)" }}
      >
        Historico de XP
      </h3>
      <div>
        {events.map((ev) => {
          const accPct = Math.round(ev.metadata.accuracy * 100);
          return (
            <div
              key={ev.id}
              className="flex items-center justify-between py-3"
              style={{ borderBottom: "1px solid var(--border-light)" }}
            >
              <div className="flex-1">
                <div
                  className="font-condensed text-sm"
                  style={{ color: "var(--text)" }}
                >
                  {formatAdminDateTime(ev.created_at)}
                </div>
                <div
                  className="font-condensed text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {ev.metadata.correct_winners}/{ev.metadata.fights_with_picks} vencedores
                </div>
              </div>
              <div className="flex-1 px-4">
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: "var(--border)" }}
                >
                  <div
                    className="h-1.5"
                    style={{
                      width: `${accPct}%`,
                      backgroundColor: "var(--red)",
                    }}
                  />
                </div>
                <div
                  className="font-condensed text-xs mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {accPct}% acerto
                </div>
              </div>
              <div
                className="font-condensed font-900 text-lg"
                style={{ color: "var(--red)" }}
              >
                +{ev.amount} XP
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire XpSummary and XpHistoryList into /profile**

Read `src/app/profile/page.tsx` (or wherever `/profile` lives). Find the section that renders profile data and add:

```typescript
import XpSummary from "@/components/profile/XpSummary";
import XpHistoryList from "@/components/profile/XpHistoryList";
import { getRecentXpEventsForUser } from "@/server/services/xp";

// inside the page component, after fetching the profile:
const xpHistory = await getRecentXpEventsForUser(userId, 10);

// in JSX, near the top of the profile section:
<XpSummary data={xpSummary} />
<XpHistoryList events={xpHistory} />
```

- [ ] **Step 4: Wire XpSummary into /jogador/[nickname]**

Read `src/app/jogador/[nickname]/page.tsx` (or similar). The XP summary is already in `getPublicProfilePageData` from Task 5. Add the component:

```typescript
import XpSummary from "@/components/profile/XpSummary";

// in JSX:
<XpSummary data={xpSummary} />
```

- [ ] **Step 5: Typecheck and run all tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: No errors, all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/components/profile/XpSummary.tsx src/components/profile/XpHistoryList.tsx src/app/profile/page.tsx src/app/jogador/\[nickname\]/page.tsx
git commit -m "feat(xp): XpSummary and XpHistoryList components on profile pages"
```

---

### Task 7: Recap + share + home banner

**Files:**
- Modify: `src/components/recap/EventRecapContent.tsx`
- Modify: `src/components/share/EventResultSharePage.tsx` (or share data types)
- Modify: `src/app/home/page.tsx` (or wherever the home page is)

- [ ] **Step 1: Add XP section to recap**

Read `src/components/recap/EventRecapContent.tsx`. Add a section that shows XP earned for the event:

```typescript
// inside the recap component, add a section for XP
{xpEarned > 0 && (
  <div className="my-4 p-4" style={{
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border)",
  }}>
    <div className="font-condensed text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
      XP ganho neste evento
    </div>
    <div className="font-condensed font-900 text-3xl" style={{ color: "var(--red)" }}>
      +{xpEarned} XP
    </div>
    <div className="font-condensed text-xs" style={{ color: "var(--text-muted)" }}>
      {Math.round(xpAccuracy * 100)}% de acerto nos vencedores
    </div>
  </div>
)}
```

The recap page receives `data: EventRecapData` — extend that type to include `xpEarned: number` and `xpAccuracy: number` (Task 5 already does this via `getEventRecapData`).

- [ ] **Step 2: Add XP to share card data**

The share card system is complex (per the audit's risk note). Do not fork the pipeline. Instead, find the share data fetcher (likely in `src/server/services/app.ts` or `src/components/share/*`) and add `level` + `currentStreak` to the data passed to the share page renderer. The renderer already takes a `data` prop — add XP fields.

Look for `getPublicEventResultShareData` and `getPublicEventPickShareData` in `app.ts` and add:

```typescript
const xpSummary = await getProfileXpSummary(profile.id);
return { ..., xpSummary };
```

Then in the share component, add a small line: `Contender · 5 eventos seguidos`.

Be conservative: a single line with level title + streak. Do not redesign the share card.

- [ ] **Step 3: Add positive-only home banner**

Read `src/app/home/page.tsx` (or wherever home is). Add a banner shown only when `currentStreak >= 3`:

```typescript
{homeData.xpSummary?.currentStreak >= 3 && (
  <div className="my-4 p-4 flex items-center gap-3" style={{
    backgroundColor: "rgba(239,68,68,0.1)",
    border: "1px solid var(--red)",
  }}>
    <span style={{ fontSize: 24 }}>🔥</span>
    <div>
      <div className="font-condensed font-900 text-sm uppercase" style={{ color: "var(--text)" }}>
        Sequencia de {homeData.xpSummary.currentStreak} eventos!
      </div>
      <div className="font-condensed text-xs" style={{ color: "var(--text-muted)" }}>
        Voce acertou 70%+ nos ultimos {homeData.xpSummary.currentStreak} eventos.
      </div>
    </div>
  </div>
)}
```

This requires `getHomePageData` to include `xpSummary`. Extend it in `app.ts`:

```typescript
const xpSummary = await getProfileXpSummary(user.id);
return { ..., xpSummary };
```

- [ ] **Step 4: Typecheck and run all tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: No errors, all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/recap/EventRecapContent.tsx src/components/share/EventResultSharePage.tsx src/app/home/page.tsx src/server/services/app.ts
git commit -m "feat(xp): XP on recap, share card, and home banner"
```

---

### Final Verification

- [ ] Run `npx tsc --noEmit` — must pass
- [ ] Run `npx vitest run` — all tests pass
- [ ] Run `npm run build` — builds successfully
- [ ] Commit any remaining changes
