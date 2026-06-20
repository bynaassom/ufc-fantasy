# Live Pick Distribution — Design (2026-06-22)

## Goal

Add per-fight pick distribution to the live feed during events: what % of
users picked each fighter as winner and each method (KO/SUB/DEC). Surfaces
pick context against the crowd. Loops served: Fight night.

## Product Decisions (locked in brainstorming)

- **Scope:** pick % per fight (winner + method).
- **Display:** compact bars under each fight in the live feed.
- **Data:** server-side aggregation from existing `picks` table.
- **No new database tables.**

## Data Model

### New API field on live data

Extend the existing `getEventLiveData` return with:

```typescript
pickDistribution: PickDistributionItem[];
```

### Types

```typescript
export interface WinnerPickSplit {
  fighterId: string;
  name: string;
  count: number;
  pct: number; // 0-100
}

export interface MethodPickSplit {
  method: string;
  count: number;
  pct: number;
}

export interface PickDistributionItem {
  fightId: string;
  winner_picks: WinnerPickSplit[];
  method_picks: MethodPickSplit[];
}
```

### Aggregation queries (per fight, using existing `picks` table)

Winner picks:
```sql
SELECT picked_winner_id, fighter:picked_winner_id(name), COUNT(*)
FROM picks
WHERE fight_id = $1 AND is_confirmed = true AND picked_winner_id IS NOT NULL
GROUP BY picked_winner_id, fighter.name
```

Method picks:
```sql
SELECT picked_method, COUNT(*)
FROM picks
WHERE fight_id = $1 AND is_confirmed = true AND picked_method IS NOT NULL
GROUP BY picked_method
```

Percentages computed client-side from totals.

## UX

### Compact bar per fight (in LiveFeed)

```
┌──────────────────────────────────────────────┐
│ 🥊 Poatan vs Adesanya                        │
│                                               │
│ Vencedor                                      │
│ Poatan 63% ████████████████████               │
│ Adesanya 37% █████████████                    │
│                                               │
│ Metodo                                        │
│ KO 45% · SUB 30% · DEC 25%                    │
└──────────────────────────────────────────────┘
```

- Bar width proportional to percentage.
- Color: red (`var(--red)`) for majority, muted border for minority.
- Method picks shown as text percentages (no bars needed — 3 values max).
- Only shown when `status === "live"`.
- Updates on same polling cadence as the live feed.
- Hidden for fights with 0 picks recorded.

## Architecture

### Modified files

- `src/server/repositories/picks.ts` — add `getPickDistributionForFight(client, fightId)`.
- `src/server/services/app.ts` — extend `getEventLiveData` to include `pickDistribution`.
- `src/components/event/LiveFeed.tsx` — add distribution bars per fight.
- `src/types/index.ts` — add `PickDistributionItem`, `WinnerPickSplit`, `MethodPickSplit`.

### New files

- `src/components/event/PickDistributionBar.tsx` — reusable bar component.

### Data flow

```
User opens live feed (polling)
  → GET /api/events/[slug]/live
  → getEventLiveData(slug) in app.ts
    → existing: fights, picks, leaderboard, myScore
    → NEW: for each fight, getPickDistributionForFight
    → return { ...existing, pickDistribution }
  → LiveFeed component renders:
    → existing fight rows
    → PickDistributionBar for each fight with distribution data
```

### Testing

- `tests/unit/picks-distribution.test.ts` — aggregation produces correct counts
  and percentages, handles zero picks, handles missing methods.

## Decomposition (~3 tasks)

1. Repository + service extension (pick distribution aggregation + getEventLiveData).
2. PickDistributionBar component + LiveFeed integration.
3. Types + final wiring.

## Out of Scope (deferred)

- Challenge impact visualization (score vs opponent during live events).
- Win method breakdown in percentage bar form.
- Historical pick distribution (for completed events).
- Pick distribution on the recap page.
