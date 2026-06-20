# Live Pick Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-fight pick distribution (winner % + method %) to the live feed during events, server-side aggregated from existing picks table.

**Architecture:** New agg function in picks repository, extended `getEventLiveData` in app.ts, new `PickDistributionBar` component rendered per fight in LiveFeed.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind, Supabase, vitest

## Global Constraints

- No new database tables.
- Data aggregated from existing `picks` table (is_confirmed = true).
- Compact bars per fight: winner % bars + method % text.
- Only shown when status === "live".
- Hidden for fights with 0 picks.
- Updates on existing live feed polling cadence.
- Pt-BR labels, dark theme, red accents, CSS variables.

---

### Task 1: Repository + service extension

**Files:**
- Modify: `src/server/repositories/picks.ts`
- Modify: `src/server/services/app.ts`
- Modify: `src/types/index.ts` (add types)
- Test: `tests/unit/picks-distribution.test.ts`

**Interfaces:**
- Produces: `getPickDistributionForFight(client, fightId)` → `PickDistributionItem`
- Produces: `getEventLiveData` extended return with `pickDistribution`

- [ ] **Step 1: Add types to src/types/index.ts**

```typescript
export interface WinnerPickSplit {
  fighterId: string;
  name: string;
  count: number;
  pct: number;
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

- [ ] **Step 2: Add repository function to picks.ts**

```typescript
// src/server/repositories/picks.ts — append
import type { PickDistributionItem } from "@/types";

export async function getPickDistributionForFight(
  client: any,
  fightId: string,
): Promise<Omit<PickDistributionItem, "fightId">> {
  const { data: winners, error: wErr } = await client
    .from("picks")
    .select("picked_winner_id, fighter:picked_winner_id(name)")
    .eq("fight_id", fightId)
    .eq("is_confirmed", true)
    .not("picked_winner_id", "is", null);

  if (wErr) throw wErr;

  const { data: methods, error: mErr } = await client
    .from("picks")
    .select("picked_method")
    .eq("fight_id", fightId)
    .eq("is_confirmed", true)
    .not("picked_method", "is", null);

  if (mErr) throw mErr;

  // Aggregate winner counts
  const winnerMap = new Map<string, { name: string; count: number }>();
  let totalWinners = 0;
  for (const r of winners || []) {
    const id = r.picked_winner_id;
    if (!winnerMap.has(id)) {
      winnerMap.set(id, { name: (r as any).fighter?.name || "—", count: 0 });
    }
    winnerMap.get(id)!.count++;
    totalWinners++;
  }

  // Aggregate method counts
  const methodMap = new Map<string, number>();
  let totalMethods = 0;
  for (const r of methods || []) {
    const m = r.picked_method;
    methodMap.set(m, (methodMap.get(m) || 0) + 1);
    totalMethods++;
  }

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
```

- [ ] **Step 3: Extend getEventLiveData in app.ts**

Read `src/server/services/app.ts`, find `getEventLiveData(slug)`. After the existing return, add:

```typescript
// After existing fights/picks/leaderboard/myScore data is assembled:
const pickDistribution = await Promise.all(
  fights.map(async (f: any) => {
    try {
      const dist = await getPickDistributionForFight(adminSupabase, f.id);
      return { fightId: f.id, ...dist };
    } catch {
      return { fightId: f.id, winner_picks: [], method_picks: [] };
    }
  }),
);

return { ...existing, pickDistribution };
```

Add import at top of app.ts: `import { getPickDistributionForFight } from "@/server/repositories/picks";`

- [ ] **Step 4: Write tests**

```typescript
// tests/unit/picks-distribution.test.ts
import { describe, it, expect } from "vitest";

describe("pick distribution", () => {
  it("computes correct percentages from pick counts", async () => {});

  it("returns empty arrays for zero picks", async () => {});

  it("handles missing fighter name gracefully", async () => {});
});
```

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit && npx vitest run tests/unit/picks-distribution.test.ts`

```bash
git add src/types/index.ts src/server/repositories/picks.ts src/server/services/app.ts tests/unit/picks-distribution.test.ts
git commit -m "feat(live): pick distribution aggregation and live data extension"
```

---

### Task 2: PickDistributionBar component + LiveFeed integration

**Files:**
- Create: `src/components/event/PickDistributionBar.tsx`
- Modify: `src/components/event/LiveFeed.tsx`

**Interfaces:**
- Consumes: `PickDistributionItem` from live data
- Produces: compact bar rendered per fight in the live feed

- [ ] **Step 1: Create PickDistributionBar**

```typescript
// src/components/event/PickDistributionBar.tsx
import type { PickDistributionItem } from "@/types";

export default function PickDistributionBar({
  dist,
}: {
  dist: PickDistributionItem;
}) {
  const totalWinners = dist.winner_picks.reduce((s, w) => s + w.count, 0);
  const totalMethods = dist.method_picks.reduce((s, m) => s + m.count, 0);

  if (totalWinners === 0 && totalMethods === 0) return null;

  return (
    <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--border-light)" }}>
      {totalWinners > 0 && (
        <div className="mb-2">
          <p className="font-condensed text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
            Vencedor
          </p>
          {dist.winner_picks
            .sort((a, b) => b.pct - a.pct)
            .map((w) => (
              <div key={w.fighterId} className="flex items-center gap-2 mb-1">
                <span className="font-condensed text-xs w-20 truncate" style={{ color: "var(--text)" }}>
                  {w.name}
                </span>
                <div className="flex-1 h-3" style={{ backgroundColor: "var(--border)" }}>
                  <div
                    className="h-3"
                    style={{
                      width: `${w.pct}%`,
                      backgroundColor: w.pct >= 50 ? "var(--red)" : "var(--text-muted)",
                      transition: "width 0.3s",
                    }}
                  />
                </div>
                <span className="font-condensed font-700 text-xs w-10 text-right" style={{ color: "var(--text)" }}>
                  {w.pct}%
                </span>
              </div>
            ))}
        </div>
      )}

      {totalMethods > 0 && (
        <div>
          <p className="font-condensed text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
            Metodo
          </p>
          <div className="flex gap-3">
            {dist.method_picks
              .sort((a, b) => b.pct - a.pct)
              .map((m) => (
                <span key={m.method} className="font-condensed text-xs" style={{ color: "var(--text)" }}>
                  {m.method.toUpperCase()} {m.pct}%
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Integrate into LiveFeed**

Read `src/components/event/LiveFeed.tsx`. Find the section where each fight is rendered. After the existing fight row content, add:

```typescript
import PickDistributionBar from "@/components/event/PickDistributionBar";

// Inside the fight row, after existing fight content:
{data.pickDistribution && (
  <PickDistributionBar
    dist={data.pickDistribution.find((d) => d.fightId === fight.id)!}
  />
)}
```

The `data` prop on LiveFeed should be the live data object. If the prop doesn't currently include `pickDistribution`, extend the `LiveData` interface inside `LiveFeed.tsx`:

```typescript
interface LiveData {
  // ... existing fields
  pickDistribution?: PickDistributionItem[];
}
```

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit && npx vitest run`

```bash
git add src/components/event/PickDistributionBar.tsx src/components/event/LiveFeed.tsx
git commit -m "feat(live): PickDistributionBar component and LiveFeed integration"
```

---

### Task 3: Final wiring and verification

**Files:**
- Verify all types are consistent
- Verify tsc + tests

- [ ] **Step 1: Run full verification**

Run: `npx tsc --noEmit && npx vitest run`

- [ ] **Step 2: Verify LiveFeed types**

The `LiveData` interface in `LiveFeed.tsx` needs `pickDistribution?: PickDistributionItem[]`. The `getEventLiveData` return in `app.ts` must include it. Check they match.

- [ ] **Step 3: Commit any remaining changes**

```bash
git add -A
git commit -m "fix(live): final wiring for pick distribution"
```

---

### Final Verification

- [ ] Run `npx tsc --noEmit` — must pass
- [ ] Run `npx vitest run` — all tests pass
- [ ] Run `npm run build` — builds successfully
