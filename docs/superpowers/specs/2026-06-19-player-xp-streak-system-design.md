# Player XP & Streak System — Design (2026-06-19)

## Goal

Reward expertise with XP (per-event weighted) and accuracy streaks (consecutive
events at 70%+ correct winners), surfaced as level titles and visible status
across the app. Loops served: League, Recap, Share.

## Product Decisions (locked in brainstorming)

- **Primary purpose:** expertise recognition (chess.com / Lichess model), not
  pure engagement grind.
- **XP unit:** per-event weighted, awarded when event transitions to
  `completed`.
- **Streak unit:** per-event accuracy streak — consecutive events with
  participation AND accuracy >= 70%. Resets if either fails.
- **Levels:** cosmetic only. Pure status signal. No unlocks.

## Rules

### XP formula (per user, per event)

```
participation   = 100   if any picks for the event, else 0
accuracy_bonus  = 50  * (correct_winners / fights_with_picks)
method_bonus    = 25  * (correct_methods / fights_with_picks)
round_bonus     = 25  * (correct_rounds  / fights_with_picks)

xp_total = round(participation + accuracy_bonus + method_bonus + round_bonus)
```

Worked example: 8 fights, 6 winners, 4 methods, 3 rounds:
`100 + 37 + 13 + 9 = 159 XP`.

### Streak rule

A user's `current_streak` is the count of their most recent consecutive
completed events where:

- The user had at least one pick for the event.
- `correct_winners / fights_with_picks >= 0.7`.

Streak resets if either condition fails. Missing an event resets the streak.

### Levels (cosmetic)

```
level       = floor(xp_total / 500) + 1
levelTitle  = lookup[level]   # see Level Titles section
```

No unlocks. Levels are pure status.

### Level Titles

| Level | Title |
| --- | --- |
| 1 | Rookie |
| 2 | Prospect |
| 3 | Contender |
| 4 | Veteran |
| 5 | Champion |
| 6+ | Legend |

## Architecture

### New tables

```sql
-- Append-only XP event log
CREATE TABLE xp_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,                       -- 'event_completion' for v1
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event_id, reason)          -- idempotency
);

CREATE INDEX idx_xp_events_user_created ON xp_events(user_id, created_at DESC);
CREATE INDEX idx_xp_events_event ON xp_events(event_id);
```

### Profile columns added (denormalized counters)

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS xp_total       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level          INTEGER NOT NULL DEFAULT 1;
```

All columns are NOT NULL with safe defaults — no data backfill required for
existing rows (users start at level 1, 0 XP).

### RLS

- `xp_events`:
  - SELECT: users can read own rows.
  - INSERT: server-only (service role key).
  - Admins can SELECT all (matches existing pattern).
- `profiles` XP columns: read-public via existing `ranking_profiles` view;
  writes server-only.

### New service files

- `src/server/repositories/xp.ts`:
  - `insertXpEvent(client, row)` — upsert via `onConflict` on
    `(user_id, event_id, reason)`.
  - `listXpEventsForUser(client, userId, limit)` — DESC by `created_at`.
  - `incrementProfileXp(client, userId, amount)` — atomic UPDATE.
  - `updateProfileStreak(client, userId, current, best)` — atomic UPDATE.
  - `updateProfileLevel(client, userId, level)` — atomic UPDATE.
- `src/server/services/xp.ts`:
  - `computeEventXpForUser(userId, eventId)` — reads `event_picks` +
    `event_scores`, returns `{ amount, metadata }`.
  - `awardEventXpForAllUsers(eventId)` — fans out across users with picks,
    inserts xp_events, increments profile counters, then recomputes streak
    and level for each affected user.
  - `recomputeStreakForUser(userId)` — walks user's xp_events DESC, finds
    longest run of consecutive events with `accuracy >= 0.7` from the head.
  - `getProfileXpSummary(userId)` — returns `XpSummary`.
  - `getRecentXpEventsForUser(userId, limit)` — for UI history list.
- `src/lib/level-titles.ts`:
  - `levelFromXp(xp)` — pure function.
  - `titleFromLevel(level)` — pure function.
  - `xpForLevel(level)` — pure function.

### Hooks into existing flow

- `src/server/services/event-lifecycle.ts` (`dispatchEventLifecycle`):
  after an event is marked `completed`, call
  `awardEventXpForAllUsers(eventId)`.
- `src/app/api/sync-results/route.ts`: after the transactional result RPC
  finishes, if the event just became `completed`, call
  `awardEventXpForAllUsers(eventId)`.

XP compute failures are caught and logged; they do not block event
completion. Idempotency via the unique constraint means re-runs are safe.

## Data Flow (per event completion)

```
event transitions to "completed"
  -> for each user with picks for the event:
       compute xp amount + metadata
       INSERT INTO xp_events (ON CONFLICT DO NOTHING)
       UPDATE profiles SET xp_total = xp_total + amount
  -> for each affected user:
       recompute current_streak (walk xp_events DESC, head-to-tail)
       UPDATE profiles SET current_streak, best_streak (best = max)
       UPDATE profiles SET level
  -> revalidatePath('/profile', '/jogador/[nickname]', '/ranking')
```

### Streak recompute algorithm

```typescript
async function recomputeStreakForUser(userId: string) {
  const events = await listXpEventsForUser(userId, 100);
  let current = 0;
  for (const ev of events) {
    if (ev.metadata.accuracy >= 0.7) current++;
    else break;
  }
  const prevBest = await getProfileBestStreak(userId);
  const best = Math.max(current, prevBest);
  await updateProfileStreak(client, userId, current, best);
}
```

`best_streak` only ever increases (monotonic). We never need to walk full
history.

## UI

### New components

- `src/components/profile/XpSummary.tsx`:
  - Level title + number (e.g., "Contender · Nivel 3").
  - XP total + progress bar to next level (500 XP per level).
  - Current streak with flame icon (e.g., "5 eventos seguidos").
  - Best streak (e.g., "Melhor: 12").
- `src/components/profile/XpHistoryList.tsx`:
  - Last 10 XP events: event name, date, XP gained, accuracy bar.

### Surfaced on existing pages

- `/profile`: `XpSummary` + `XpHistoryList` near the top of the page.
- `/jogador/[nickname]`: `XpSummary` (public).
- `/recap/[slug]`: add "+159 XP neste evento" with accuracy breakdown.
- Share cards (existing routes): append `level` + `current_streak` to the
  card data, extend server-side renderer.

### Home banner

- Positive only. Shown when `currentStreak >= 3`.
- Text: "Voce esta numa sequencia de {N} eventos com 70%+ de acerto!"

## Types

```typescript
// src/types/index.ts
export interface XpEvent {
  id: string;
  user_id: string;
  event_id: string;
  amount: number;
  reason: string;
  metadata: XpEventMetadata;
  created_at: string;
}

export interface XpEventMetadata {
  accuracy: number;          // 0..1, correct_winners / fights_with_picks
  method_acc: number;        // 0..1
  round_acc: number;         // 0..1
  fights_with_picks: number;
  correct_winners: number;
  correct_methods: number;
  correct_rounds: number;
}

export interface XpSummary {
  xpTotal: number;
  level: number;
  levelTitle: string;
  currentStreak: number;
  bestStreak: number;
  nextLevelXp: number;       // XP needed to reach next level
  progressToNextLevel: number; // 0..1
}
```

## Error Handling

- XP compute failure: caught, logged to activity_logs with action
  `xp_compute_failed`, event still completes.
- Streak recompute failure: leaves previous streak value, logged.
- Best streak is monotonic (never decreases) — safe against partial failures.
- INSERT uses ON CONFLICT DO NOTHING for idempotency.

## Testing

### Unit tests (vitest)

- `tests/unit/xp.test.ts`:
  - `computeEventXpForUser` with various accuracy combos (0/8, 8/8, 4/8).
  - XP rounding to whole numbers.
  - Zero picks case returns 0, no xp_events row.
- `tests/unit/streak.test.ts`:
  - Streak increments on consecutive >= 70% events.
  - Streak resets on accuracy < 70%.
  - Streak resets on missed event.
  - `best_streak` is monotonic (never decreases).
- `tests/unit/level-titles.test.ts`:
  - `levelFromXp(0) = 1` (Rookie).
  - `levelFromXp(499) = 1`.
  - `levelFromXp(500) = 2` (Prospect).
  - `levelFromXp(2500) = 6` (Legend).
  - Title boundary cases.
- `tests/unit/xp-repository.test.ts`:
  - `insertXpEvent` is idempotent on (user_id, event_id, reason).
  - `listXpEventsForUser` returns DESC by created_at.

### Integration tests (manual for v1)

- Trigger event completion via `sync-results` admin route.
- Verify `xp_events` row inserted, profile counters updated.
- Verify `/profile` shows correct XP, level, streak.

## File Structure

```
supabase/migrations/
  20260620000000_xp_system.sql           # new

src/server/repositories/
  xp.ts                                  # new

src/server/services/
  xp.ts                                  # new

src/lib/
  level-titles.ts                        # new (pure)

src/components/profile/
  XpSummary.tsx                          # new
  XpHistoryList.tsx                      # new

src/types/index.ts                       # modify (add XpEvent, XpSummary)

src/server/services/app.ts               # modify (extend getMyProfile, getPublicProfilePageData, getEventRecapData)
src/server/services/event-lifecycle.ts   # modify (hook XP award)
src/app/api/sync-results/route.ts        # modify (hook XP award)
```

## Scope and Decomposition

This spec covers the XP & streak system in one slice. It is appropriately
scoped for a single implementation plan (5-7 tasks):

1. Migration + level-titles pure module.
2. XP repository + service (`computeEventXpForUser`, `awardEventXpForAllUsers`).
3. Hook into `event-lifecycle` and `sync-results`.
4. Streak recompute + level recompute.
5. Types + page data extensions.
6. `XpSummary` + `XpHistoryList` UI components.
7. Recap + share card + home banner integration.

## Out of Scope (deferred)

- Level-up / streak-milestone notifications (will be a separate spec on the
  notification type expansion track from the audit).
- XP history page with filters.
- XP leaderboard (rank by XP across all users).
- League-scoped XP / streaks (current design is global).
- Decay (losing XP for inactivity) — explicitly rejected.
- Unlocks tied to levels.
