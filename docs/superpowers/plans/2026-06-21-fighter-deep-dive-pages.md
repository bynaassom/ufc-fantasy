# Fighter Deep-Dive Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add fighter profile pages at `/lutador/[slug]` showing stats (via existing UFCStats scraper), recent form, and fantasy pick stats, plus navigation links from fight cards.

**Architecture:** Reuse the existing `/api/fighter-stats/[slug]` route (on-demand UFC.com.br scraper) for fighting stats. Add a `slug` column to `fighters` table. Compute form (last 5 fights) and pick stats (pick rate, win rate) from existing `fights` + `event_picks` data. Build a new profile page consuming a new `/api/fighter/[slug]/profile` aggregator endpoint. Add links from FightCard and FightStatsCompare.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind, Supabase, vitest

## Global Constraints

- **Stats data:** reuse existing `/api/fighter-stats/[slug]` (on-demand UFC.com.br scraper, 1h cache, pt-BR + EN parsing). Do NOT build a new scraper.
- **Form:** last 5 completed fights from `fights` table, ordered by event_date DESC.
- **Pick stats:** aggregated from `event_picks` joined with `fights`. Pick rate, win-when-picked, events-picked count.
- **Slug:** generated from fighter name, stored in `fighters.slug` (not unique — collisions append `-2`, `-3` etc).
- **URL:** `/lutador/[slug]` — if no slug, fall back to `/lutador/[id]`.
- **Copy/UX:** Pt-BR, dark theme with red accents, CSS variables.
- **No new scraper.** No new admin cron.

---

### Task 1: Migration + slug generation utility

**Files:**
- Create: `supabase/migrations/20260621000000_fighter_slug.sql`
- Create: `src/lib/fighter-slug.ts`
- Test: `tests/unit/fighter-slug.test.ts`

**Interfaces:**
- Produces: `fighters.slug TEXT` column
- Produces: `generateFighterSlug(name)` — pure function, same algorithm as existing `toSlug` in fighter-stats route

- [ ] **Step 1: Create the migration**

```sql
-- 20260621000000_fighter_slug.sql
ALTER TABLE fighters
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE INDEX IF NOT EXISTS idx_fighters_slug ON fighters(slug);
```

- [ ] **Step 2: Create the slug utility**

```typescript
// src/lib/fighter-slug.ts
export function generateFighterSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
```

This matches the existing `toSlug` function in `src/app/api/fighter-stats/[slug]/route.ts:15-23`.

- [ ] **Step 3: Write tests**

```typescript
// tests/unit/fighter-slug.test.ts
import { describe, it, expect } from "vitest";
import { generateFighterSlug } from "@/lib/fighter-slug";

describe("generateFighterSlug", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(generateFighterSlug("Alex Pereira")).toBe("alex-pereira");
  });

  it("removes accents", () => {
    expect(generateFighterSlug("Jose Aldo")).toBe("jose-aldo");
  });

  it("strips special characters", () => {
    expect(generateFighterSlug("Conor 'Notorious' McGregor")).toBe("conor-notorious-mcgregor");
  });

  it("handles single name", () => {
    expect(generateFighterSlug("Poatan")).toBe("poatan");
  });

  it("collapses multiple spaces into single hyphens", () => {
    expect(generateFighterSlug("Jon   Jones")).toBe("jon-jones");
  });
});
```

Run: `npx vitest run tests/unit/fighter-slug.test.ts`
Expected: 5/5 pass

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260621000000_fighter_slug.sql src/lib/fighter-slug.ts tests/unit/fighter-slug.test.ts
git commit -m "feat(fighter): slug column on fighters table and slug utility"
```

---

### Task 2: Fighter profile data service

**Files:**
- Create: `src/server/repositories/fighter-profile.ts`
- Create: `src/server/services/fighter-profile.ts`
- Test: `tests/unit/fighter-profile.test.ts`

**Interfaces:**
- Consumes: `generateFighterSlug` from Task 1
- Produces: `findFighterBySlug(slug)` — DB lookup
- Produces: `computeFighterForm(fighterId)` — last 5 fights
- Produces: `computeFighterPickStats(fighterId)` — aggregated pick stats
- Produces: `getFighterProfileData(slug)` — combined result

- [ ] **Step 1: Create the repository**

```typescript
// src/server/repositories/fighter-profile.ts
import type { DbClient } from "@/types/database";
import type { Fighter } from "@/types";

export async function findFighterBySlug(
  client: DbClient,
  slug: string,
): Promise<Fighter | null> {
  const { data, error } = await client
    .from("fighters")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as Fighter) || null;
}

export async function findFighterById(
  client: DbClient,
  id: string,
): Promise<Fighter | null> {
  const { data, error } = await client
    .from("fighters")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as Fighter) || null;
}

export type FighterFormEntry = {
  event_name: string;
  event_date: string;
  opponent_name: string;
  result: "W" | "L" | "D" | "NC";
  method: string;
  round: number | null;
};

export async function listFighterRecentFights(
  client: DbClient,
  fighterId: string,
  limit = 5,
): Promise<FighterFormEntry[]> {
  const { data, error } = await client
    .from("fights")
    .select(`
      id,
      winner_id, result_method, result_round,
      event:event_id(name, event_date),
      fighter_a:fighter_a_id(name),
      fighter_b:fighter_b_id(name)
    `)
    .or(`fighter_a_id.eq.${fighterId},fighter_b_id.eq.${fighterId}`)
    .not("winner_id", "is", null)
    .order("event(event_date)", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((f: any) => {
    const isA = f.fighter_a_id === fighterId;
    const opponent = isA ? f.fighter_b.name : f.fighter_a.name;
    const won = f.winner_id === fighterId;
    const drawOrNc = !f.winner_id || f.result_method === "no_contest";
    const result = drawOrNc ? "NC" : won ? "W" : "L";

    return {
      event_name: f.event?.name || "—",
      event_date: f.event?.event_date || "",
      opponent_name: opponent || "—",
      result,
      method: f.result_method || "—",
      round: f.result_round ?? null,
    };
  });
}

export type FighterPickStats = {
  pick_rate: number;
  win_when_picked: number;
  total_events_picked: number;
};

export async function getFighterPickStats(
  client: DbClient,
  fighterId: string,
): Promise<FighterPickStats> {
  const { data, error } = await client
    .from("event_picks")
    .select("fight_id, winner_id, fights!inner(winner_id)")
    .eq("fights.fighter_a_id", fighterId)
    .or(`fights.fighter_b_id.eq.${fighterId}`)
    .not("winner_id", "is", null);

  if (error) throw error;
  const picks = data || [];

  const total = picks.length;
  const wins = picks.filter((p: any) => p.winner_id === p.fights?.winner_id).length;

  // Distinct event count for pick rate calculation will be done in service layer
  const { data: eventData, error: eventError } = await client
    .from("fights")
    .select("id", { count: "exact", head: true })
    .or(`fighter_a_id.eq.${fighterId},fighter_b_id.eq.${fighterId}`);

  if (eventError) throw eventError;

  // For pick_rate: percentage of users who picked this fighter across all fights
  return {
    pick_rate: 0, // computed in service from total_picks / total_events_with_picks
    win_when_picked: total > 0 ? Math.round((wins / total) * 100) : 0,
    total_events_picked: total,
  };
}
```

- [ ] **Step 2: Create the service**

```typescript
// src/server/services/fighter-profile.ts
import { getServiceRoleSupabase } from "@/lib/supabase/service-role";
import {
  findFighterBySlug,
  findFighterById,
  listFighterRecentFights,
  getFighterPickStats,
} from "@/server/repositories/fighter-profile";
import type { Fighter } from "@/types";

export type FighterProfileData = {
  fighter: Fighter;
  form: Awaited<ReturnType<typeof listFighterRecentFights>>;
  pickStats: Awaited<ReturnType<typeof getFighterPickStats>>;
};

export async function getFighterProfileData(
  slug: string,
): Promise<FighterProfileData> {
  const admin = await getServiceRoleSupabase();

  let fighter = await findFighterBySlug(admin, slug);
  if (!fighter) {
    fighter = await findFighterById(admin, slug);
  }
  if (!fighter) {
    throw new Error("Lutador não encontrado");
  }

  const [form, pickStats] = await Promise.all([
    listFighterRecentFights(admin, fighter.id),
    getFighterPickStats(admin, fighter.id),
  ]);

  return { fighter, form, pickStats };
}
```

- [ ] **Step 3: Write tests**

```typescript
// tests/unit/fighter-profile.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOr = vi.fn();
const mockNot = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleSupabase: vi.fn(() => Promise.resolve({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          or: vi.fn(() => ({
            not: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          })),
        })),
      })),
    })),
  })),
}));

describe("fighter profile", () => {
  it("findFighterBySlug returns null for unknown slug", async () => {
    const { findFighterBySlug } = await import(
      "@/server/repositories/fighter-profile"
    );
    const client: any = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({ data: null, error: null }),
            ),
          })),
        })),
      })),
    };
    const result = await findFighterBySlug(client, "no-one");
    expect(result).toBeNull();
  });

  it("getFighterProfileData throws for unknown slug", async () => {
    const { getFighterProfileData } = await import(
      "@/server/services/fighter-profile"
    );
    await expect(getFighterProfileData("no-one")).rejects.toThrow(
      "Lutador não encontrado",
    );
  });
});
```

Run: `npx vitest run tests/unit/fighter-profile.test.ts`
Expected: 2/2 pass

- [ ] **Step 4: Typecheck and commit**

Run: `npx tsc --noEmit`

```bash
git add src/server/repositories/fighter-profile.ts src/server/services/fighter-profile.ts tests/unit/fighter-profile.test.ts
git commit -m "feat(fighter): profile data service with form and pick stats"
```

---

### Task 3: API route for fighter profile

**Files:**
- Create: `src/app/api/fighter/[slug]/profile/route.ts`
- Modify: `src/types/index.ts` (add FighterProfileData type if needed)

**Interfaces:**
- Consumes: `getFighterProfileData` from Task 2
- Produces: `GET /api/fighter/[slug]/profile` — returns `{ fighter, form, pickStats }`

- [ ] **Step 1: Create the API route**

```typescript
// src/app/api/fighter/[slug]/profile/route.ts
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { getFighterProfileData } from "@/server/services/fighter-profile";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const data = await getFighterProfileData(params.slug);
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npx tsc --noEmit`

```bash
git add src/app/api/fighter/\[slug\]/profile/route.ts
git commit -m "feat(fighter): profile API route /api/fighter/[slug]/profile"
```

---

### Task 4: Fighter profile page (/lutador/[slug])

**Files:**
- Create: `src/app/lutador/[slug]/page.tsx`
- Create: `src/components/fighter/FighterProfileClient.tsx`

**Interfaces:**
- Consumes: `GET /api/fighter/[slug]/profile` (server-side fetch) + `GET /api/fighter-stats/[slug]` (client-side fetch)
- Produces: full profile page with hero, record, stats grid, form timeline, pick stats

- [ ] **Step 1: Create the page component**

```typescript
// src/app/lutador/[slug]/page.tsx
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import FighterProfileClient from "@/components/fighter/FighterProfileClient";
import { getFighterProfileData } from "@/server/services/fighter-profile";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  try {
    const data = await getFighterProfileData(params.slug);
    return {
      title: `${data.fighter.name} · Lutador · UFC Fantasy`,
      description: `Perfil de ${data.fighter.name}: recorde, estatísticas, histórico recente e desempenho no fantasy.`,
    };
  } catch {
    return { title: "Lutador · UFC Fantasy" };
  }
}

export default async function FighterProfilePage({
  params,
}: {
  params: { slug: string };
}) {
  let profileData;
  try {
    profileData = await getFighterProfileData(params.slug);
  } catch {
    notFound();
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
    >
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <FighterProfileClient
          fighter={profileData.fighter}
          form={profileData.form}
          pickStats={profileData.pickStats}
          slug={params.slug}
        />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create the client component**

```typescript
// src/components/fighter/FighterProfileClient.tsx
"use client";

import { useEffect, useState } from "react";
import type { Fighter } from "@/types";
import type { FighterFormEntry, FighterPickStats } from "@/server/repositories/fighter-profile";

interface Props {
  fighter: Fighter;
  form: FighterFormEntry[];
  pickStats: FighterPickStats;
  slug: string;
}

interface FighterStats {
  record: string;
  physical: { height: string; weight: string; reach: string; legReach: string };
  striking: { slpm: string; sapm: string; strAcc: string; strDef: string };
  grappling: { tdAvg: string; tdAcc: string; tdDef: string; subAvg: string };
  wins_by: { ko: { count: string; pct: string }; dec: { count: string; pct: string }; sub: { count: string; pct: string } };
}

export default function FighterProfileClient({ fighter, form, pickStats, slug }: Props) {
  const [stats, setStats] = useState<FighterStats | null>(null);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    fetch(`/api/fighter-stats/${slug}?name=${encodeURIComponent(fighter.name)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setStatsError(true); return; }
        setStats(data);
      })
      .catch(() => setStatsError(true));
  }, [slug, fighter.name]);

  return (
    <div>
      {/* Hero */}
      <div className="flex flex-col items-center mb-8">
        {fighter.headshot_url && (
          <img
            src={fighter.headshot_url}
            alt={fighter.name}
            className="w-32 h-32 rounded-full object-cover mb-4"
            style={{ border: "4px solid var(--red)" }}
          />
        )}
        <h1
          className="font-condensed font-900 text-3xl uppercase text-center"
          style={{ color: "var(--text)" }}
        >
          {fighter.name}
        </h1>
        {fighter.country && (
          <p
            className="font-condensed text-sm uppercase tracking-widest mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            {fighter.country}
          </p>
        )}
      </div>

      {/* Record */}
      {stats?.record && stats.record !== "--" && (
        <div className="mb-6 p-4" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <h3 className="font-condensed font-700 text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Recorde
          </h3>
          <p className="font-condensed font-900 text-2xl" style={{ color: "var(--text)" }}>
            {stats.record}
          </p>
        </div>
      )}

      {/* Stats Grid */}
      {stats && !statsError && (
        <div className="mb-6 p-4" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <h3 className="font-condensed font-700 text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Estatisticas (UFC)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Striking/min", value: stats.striking.slpm },
              { label: "Precisao", value: stats.striking.strAcc !== "--" ? `${stats.striking.strAcc}%` : "--" },
              { label: "Defesa", value: stats.striking.strDef !== "--" ? `${stats.striking.strDef}%` : "--" },
              { label: "Absorvidos/min", value: stats.striking.sapm },
              { label: "Quedas/15min", value: stats.grappling.tdAvg },
              { label: "Prec. Queda", value: stats.grappling.tdAcc !== "--" ? `${stats.grappling.tdAcc}%` : "--" },
              { label: "Def. Queda", value: stats.grappling.tdDef !== "--" ? `${stats.grappling.tdDef}%` : "--" },
              { label: "Finaliz/15min", value: stats.grappling.subAvg },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-condensed text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  {s.label}
                </p>
                <p className="font-condensed font-900 text-xl" style={{ color: "var(--text)" }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
          {stats.physical.height !== "--" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4" style={{ borderTop: "1px solid var(--border-light)" }}>
              {[
                { label: "Altura", value: stats.physical.height },
                { label: "Peso", value: stats.physical.weight },
                { label: "Envergadura", value: stats.physical.reach },
                { label: "Pernas", value: stats.physical.legReach },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-condensed text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    {s.label}
                  </p>
                  <p className="font-condensed font-900 text-lg" style={{ color: "var(--text)" }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {statsError && (
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Estatisticas UFC indisponiveis no momento.
        </p>
      )}

      {!stats && !statsError && (
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Carregando estatisticas...
        </p>
      )}

      {/* Form Timeline */}
      {form.length > 0 && (
        <div className="mb-6 p-4" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <h3 className="font-condensed font-700 text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Ultimas Lutas
          </h3>
          {form.map((f, i) => {
            const dot = f.result === "W" ? "🟢" : f.result === "L" ? "🔴" : "⚪";
            return (
              <div
                key={i}
                className="flex items-center gap-3 py-2"
                style={{ borderBottom: i < form.length - 1 ? "1px solid var(--border-light)" : "none" }}
              >
                <span className="text-sm">{dot}</span>
                <div className="flex-1">
                  <p className="font-condensed text-sm" style={{ color: "var(--text)" }}>
                    vs {f.opponent_name} · {f.method.toUpperCase()}
                    {f.round ? ` Rd ${f.round}` : ""}
                  </p>
                  <p className="font-condensed text-xs" style={{ color: "var(--text-muted)" }}>
                    {f.event_name} · {new Date(f.event_date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fantasy Pick Stats */}
      <div className="mb-6 p-4" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
        <h3 className="font-condensed font-700 text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
          No UFC Fantasy
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-condensed text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Escolhido em
            </p>
            <p className="font-condensed font-900 text-xl" style={{ color: "var(--text)" }}>
              {pickStats.total_events_picked} evento{pickStats.total_events_picked !== 1 ? "s" : ""}
            </p>
          </div>
          <div>
            <p className="font-condensed text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Venceu quando escolhido
            </p>
            <p className="font-condensed font-900 text-xl" style={{ color: "var(--text)" }}>
              {pickStats.win_when_picked}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit`

```bash
git add src/app/lutador/\[slug\]/page.tsx src/components/fighter/FighterProfileClient.tsx
git commit -m "feat(fighter): profile page at /lutador/[slug]"
```

---

### Task 5: Links from FightCard and FightStatsCompare

**Files:**
- Modify: `src/components/event/FightCard.tsx`
- Modify: `src/components/event/FightStatsCompare.tsx`

**Interfaces:**
- Consumes: `slug` from fighter data (needs to be added to Fight/Fighter types)
- Produces: clickable fighter names → profile page

- [ ] **Step 1: Add slug to FightCard**

Read `src/components/event/FightCard.tsx`. The `fight` prop contains `fighter_a: Fighter` and `fighter_b: Fighter`. The `Fighter` type in `src/types/index.ts` needs `slug` added to it (the DB column was added in Task 1, the type should match).

Add to `src/types/index.ts` in the `Fighter` interface:
```typescript
export interface Fighter {
  // ... existing fields
  slug?: string;
}
```

Then in `FightCard.tsx`, below each fighter's name, add a small "Ver perfil" link:
```tsx
{fighter.slug && (
  <a
    href={`/lutador/${fighter.slug}`}
    className="font-condensed text-xs uppercase tracking-widest mt-1 inline-block"
    style={{ color: "var(--text-muted)" }}
    onClick={(e) => e.stopPropagation()} // prevent triggering the pick button
  >
    Ver perfil
  </a>
)}
```

Wrap in `e.stopPropagation()` so clicking the link doesn't also trigger the parent button's `selectFighter`.

- [ ] **Step 2: Add link to FightStatsCompare**

Read `src/components/event/FightStatsCompare.tsx`. Add a "Ver perfil completo" link after each fighter's stats section that links to `/lutador/${slugA}` and `/lutador/${slugB}`.

```tsx
{sameSlugA && (
  <a
    href={`/lutador/${slugA}`}
    className="font-condensed text-xs uppercase tracking-widest mt-2 inline-block"
    style={{ color: "var(--red)" }}
  >
    Ver perfil de {nameA} →
  </a>
)}
```

- [ ] **Step 3: Typecheck and run all tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: No errors, all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/event/FightCard.tsx src/components/event/FightStatsCompare.tsx src/types/index.ts
git commit -m "feat(fighter): navigation links from fight cards to profile page"
```

---

### Final Verification

- [ ] Run `npx tsc --noEmit` — must pass
- [ ] Run `npx vitest run` — all tests pass
- [ ] Run `npm run build` — builds successfully
- [ ] Commit any remaining changes
