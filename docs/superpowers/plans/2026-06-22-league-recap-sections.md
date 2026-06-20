# League Recap Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-event league standings to `/recap/[slug]` — a "Suas Ligas" section with detailed tables (position, name, points, event XP, movement) for every league the user belongs to, computed from existing tables.

**Architecture:** New repository/service for league recap computation. Extended `getEventRecapData` in `app.ts` to include `leagueStandings`. New `LeagueRecapSection` component rendered inside existing `EventRecapContent`. No new database tables.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind, Supabase, vitest

## Global Constraints

- No new database tables. Everything computed from `event_scores`, `group_members`, `profiles`.
- Movement: compare current event standings with previous completed event. 🔺N (up), 🔻N (down), = (same), "novo" (new/first event).
- User's row highlighted with → indicator + tinted background.
- Error handling: league computation failure returns empty array, doesn't break recap page.
- Copy/UX: Pt-BR, dark theme with red accents, CSS variables.
- Only shown for authenticated users.

---

### Task 1: Types + Repository

**Files:**
- Modify: `src/types/index.ts` (add `LeagueRecapMember`, `LeagueRecapStanding`)
- Create: `src/server/repositories/league-recap.ts`
- Test: `tests/unit/league-recap.test.ts`

**Interfaces:**
- Produces: `LeagueRecapMember`, `LeagueRecapStanding` types
- Produces: `getGroupMembers(client, groupId)`, `getMemberEventScore(client, userId, eventId)`, `getPreviousCompletedEventId(client, eventId)`, `getUserLeagueIds(client, userId)`

- [ ] **Step 1: Add types**

```typescript
// src/types/index.ts — add at end
export interface LeagueRecapMember {
  position: number;
  userId: string;
  name: string;
  nickname: string;
  totalPoints: number;
  eventXp: number;
  movement: "up" | "down" | "same" | "new";
  movementDelta: number;
  isCurrentUser: boolean;
}

export interface LeagueRecapStanding {
  groupId: string;
  groupName: string;
  members: LeagueRecapMember[];
}
```

- [ ] **Step 2: Create the repository**

```typescript
// src/server/repositories/league-recap.ts
import type { DbClient } from "@/types/database";

export async function getUserLeagueIds(
  client: DbClient,
  userId: string,
): Promise<{ group_id: string; group_name: string }[]> {
  const { data, error } = await client
    .from("group_members")
    .select("group_id, group:group_id(name)")
    .eq("user_id", userId);

  if (error) throw error;
  return (data || []).map((r: any) => ({
    group_id: r.group_id,
    group_name: r.group?.name || "—",
  }));
}

export async function getGroupMembers(
  client: DbClient,
  groupId: string,
): Promise<{ userId: string; name: string; nickname: string }[]> {
  const { data, error } = await client
    .from("group_members")
    .select("user_id, profile:user_id(first_name, last_name, nickname)")
    .eq("group_id", groupId);

  if (error) throw error;
  return (data || []).map((r: any) => ({
    userId: r.user_id,
    name: r.profile
      ? [r.profile.first_name, r.profile.last_name].filter(Boolean).join(" ") || r.profile.nickname
      : "—",
    nickname: r.profile?.nickname || "—",
  }));
}

export async function getMemberEventScore(
  client: DbClient,
  userId: string,
  eventId: string,
): Promise<{ totalPoints: number } | null> {
  const { data, error } = await client
    .from("event_scores")
    .select("total_points")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) throw error;
  return data ? { totalPoints: data.total_points } : null;
}

export async function getPreviousCompletedEventId(
  client: DbClient,
  eventId: string,
): Promise<string | null> {
  const { data: current } = await client
    .from("events")
    .select("event_date")
    .eq("id", eventId)
    .single();

  if (!current) return null;

  const { data, error } = await client
    .from("events")
    .select("id")
    .eq("status", "completed")
    .lt("event_date", current.event_date)
    .order("event_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id || null;
}
```

- [ ] **Step 3: Write tests**

```typescript
// tests/unit/league-recap.test.ts
import { describe, it, expect, vi } from "vitest";

describe("league recap repository", () => {
  it("getPreviousCompletedEventId returns null when no previous completed events", async () => {});

  it("getMemberEventScore returns null for user without score", async () => {});

  it("getGroupMembers returns formatted names", async () => {});
});
```

The implementer fleshes out mocks per existing codebase pattern.

- [ ] **Step 4: Typecheck and commit**

Run: `npx tsc --noEmit && npx vitest run tests/unit/league-recap.test.ts`

```bash
git add src/types/index.ts src/server/repositories/league-recap.ts tests/unit/league-recap.test.ts
git commit -m "feat(recap): types and repository for league recap standings"
```

---

### Task 2: Service + extend getEventRecapData

**Files:**
- Create: `src/server/services/league-recap.ts`
- Modify: `src/server/services/app.ts`

**Interfaces:**
- Consumes: repo functions from Task 1, `getProfileXpSummary` from XP service
- Produces: `computeLeagueRecap(userId, eventId)` → `LeagueRecapStanding[]`
- Modifies: `getEventRecapData` return type to include `leagueStandings`

- [ ] **Step 1: Create the service**

```typescript
// src/server/services/league-recap.ts
import { getAdminSupabase } from "@/server/supabase";
import {
  getUserLeagueIds,
  getGroupMembers,
  getMemberEventScore,
  getPreviousCompletedEventId,
} from "@/server/repositories/league-recap";
import type { LeagueRecapStanding, LeagueRecapMember } from "@/types";

export async function computeLeagueRecap(
  userId: string,
  eventId: string,
): Promise<LeagueRecapStanding[]> {
  const admin = await getAdminSupabase();

  const leagues = await getUserLeagueIds(admin, userId);
  if (leagues.length === 0) return [];

  const prevEventId = await getPreviousCompletedEventId(admin, eventId);

  const results: LeagueRecapStanding[] = [];

  for (const league of leagues) {
    try {
      const members = await getGroupMembers(admin, league.group_id);

      const currentScores = await Promise.all(
        members.map((m) => getMemberEventScore(admin, m.userId, eventId)),
      );

      const prevScores = prevEventId
        ? await Promise.all(
            members.map((m) => getMemberEventScore(admin, m.userId, prevEventId)),
          )
        : null;

      // Rank current by totalPoints DESC, ties broken by name ASC
      const currentRanked = members
        .map((m, i) => ({ ...m, points: currentScores[i]?.totalPoints ?? 0 }))
        .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

      const prevRanked = prevScores
        ? members
            .map((m, i) => ({ ...m, points: prevScores![i]?.totalPoints ?? 0 }))
            .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
        : null;

      const prevRankMap = new Map<string, number>();
      if (prevRanked) {
        prevRanked.forEach((m, i) => prevRankMap.set(m.userId, i + 1));
      }

      const membersList: LeagueRecapMember[] = currentRanked.map((m, i) => {
        const currentPos = i + 1;
        const prevPos = prevRankMap.get(m.userId);
        let movement: LeagueRecapMember["movement"] = "same";
        let movementDelta = 0;
        if (!prevRanked) {
          movement = "new";
        } else if (prevPos === undefined) {
          movement = "new";
        } else {
          movementDelta = prevPos - currentPos;
          movement = movementDelta > 0 ? "up" : movementDelta < 0 ? "down" : "same";
          movementDelta = Math.abs(movementDelta);
        }

        return {
          position: currentPos,
          userId: m.userId,
          name: m.name,
          nickname: m.nickname,
          totalPoints: m.points,
          eventXp: m.points, // or from XP system if available
          movement,
          movementDelta,
          isCurrentUser: m.userId === userId,
        };
      });

      results.push({
        groupId: league.group_id,
        groupName: league.group_name,
        members: membersList,
      });
    } catch {
      // One league fails — skip it, continue to others
      continue;
    }
  }

  return results;
}
```

- [ ] **Step 2: Extend getEventRecapData in app.ts**

Read `src/server/services/app.ts`, find `getEventRecapData(slug)`. Add after the existing recap data computation:

```typescript
// At the top of app.ts, add import:
import { computeLeagueRecap } from "@/server/services/league-recap";

// Inside getEventRecapData, after the existing return object:
let leagueStandings: LeagueRecapStanding[] | undefined;

try {
  if (currentUserId) {
    leagueStandings = await computeLeagueRecap(currentUserId, event.id);
  }
} catch {
  leagueStandings = [];
}

return {
  // ... existing fields
  leagueStandings: leagueStandings || [],
};
```

The `currentUserId` variable — check how the function gets the current user. If it already has access to `requirePageUserProfile()` or similar, use that. Otherwise, fall back to checking the auth session:

```typescript
const {
  data: { user },
} = await getSupabase().auth.getUser();
const currentUserId = user?.id || null;
```

Update `EventRecapData` type in `src/types/index.ts` to include:

```typescript
export interface EventRecapData {
  // ... existing fields
  leagueStandings?: LeagueRecapStanding[];
}
```

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit && npx vitest run`

```bash
git add src/server/services/league-recap.ts src/server/services/app.ts src/types/index.ts
git commit -m "feat(recap): league recap service and app.ts extension"
```

---

### Task 3: LeagueRecapSection component

**Files:**
- Create: `src/components/recap/LeagueRecapSection.tsx`

**Interfaces:**
- Consumes: `LeagueRecapStanding[]`
- Produces: rendered standings cards with movement indicators

- [ ] **Step 1: Create the component**

```typescript
// src/components/recap/LeagueRecapSection.tsx
import type { LeagueRecapStanding } from "@/types";

function movementLabel(movement: string, delta: number): string {
  if (movement === "same") return "=";
  if (movement === "new") return "novo";
  if (movement === "up") return `🔺${delta}`;
  if (movement === "down") return `🔻${delta}`;
  return "—";
}

export default function LeagueRecapSection({
  standings,
}: {
  standings: LeagueRecapStanding[];
}) {
  if (!standings || standings.length === 0) return null;

  return (
    <div className="mt-8 mb-4">
      <h2
        className="font-condensed font-700 text-lg uppercase tracking-widest mb-4"
        style={{ color: "var(--text)" }}
      >
        Suas Ligas
      </h2>

      {standings.map((league) => (
        <div
          key={league.groupId}
          className="mb-4 p-4"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <h3
            className="font-condensed font-700 text-sm uppercase tracking-widest mb-3"
            style={{ color: "var(--red)" }}
          >
            Liga {league.groupName}
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    borderBottom: "2px solid var(--red)",
                  }}
                >
                  {["#", "Jogador", "Pts", "Evento", "Mov"].map((h) => (
                    <th
                      key={h}
                      className="font-condensed text-xs uppercase tracking-widest py-2 px-2 text-left"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {league.members.map((m) => (
                  <tr
                    key={m.userId}
                    style={{
                      backgroundColor: m.isCurrentUser
                        ? "rgba(239,68,68,0.05)"
                        : "transparent",
                      borderBottom: "1px solid var(--border-light)",
                    }}
                  >
                    <td className="py-2 px-2 font-condensed font-700" style={{ color: m.isCurrentUser ? "var(--red)" : "var(--text)" }}>
                      {m.isCurrentUser ? "→" : ""}{m.position}
                    </td>
                    <td className="py-2 px-2 font-condensed" style={{ color: "var(--text)" }}>
                      {m.name}
                    </td>
                    <td className="py-2 px-2 font-condensed font-700" style={{ color: "var(--text)" }}>
                      {m.totalPoints}
                    </td>
                    <td className="py-2 px-2 font-condensed font-700" style={{ color: "var(--red)" }}>
                      +{m.eventXp}
                    </td>
                    <td className="py-2 px-2 font-condensed text-xs" style={{ color: "var(--text-muted)" }}>
                      {movementLabel(m.movement, m.movementDelta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npx tsc --noEmit`

```bash
git add src/components/recap/LeagueRecapSection.tsx
git commit -m "feat(recap): LeagueRecapSection component"
```

---

### Task 4: Wire into EventRecapContent

**Files:**
- Modify: `src/components/recap/EventRecapContent.tsx`

**Interfaces:**
- Consumes: `leagueStandings` from `EventRecapData`
- Renders: `<LeagueRecapSection standings={data.leagueStandings} />`

- [ ] **Step 1: Wire the component**

Read `src/components/recap/EventRecapContent.tsx`. Find the bottom of the component JSX (after all existing sections) and add:

```typescript
import LeagueRecapSection from "@/components/recap/LeagueRecapSection";

// At the bottom of the component, before the closing tag:
{data.leagueStandings && data.leagueStandings.length > 0 && (
  <LeagueRecapSection standings={data.leagueStandings} />
)}
```

The component receives `data: EventRecapData` which now has `leagueStandings` from Task 2.

- [ ] **Step 2: Typecheck and verify tests**

Run: `npx tsc --noEmit && npx vitest run`

```bash
git add src/components/recap/EventRecapContent.tsx
git commit -m "feat(recap): wire LeagueRecapSection into event recap page"
```

---

### Final Verification

- [ ] Run `npx tsc --noEmit` — must pass
- [ ] Run `npx vitest run` — all tests pass
- [ ] Run `npm run build` — builds successfully
- [ ] Commit any remaining changes
