# Challenge Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one-click challenge creation from profiles using 3 templates (beat_my_score, more_winners, use_my_picks).

**Architecture:** Add `template_type` column to challenges, extend API to accept template param, add `ChallengeTemplates` component on profiles, extend challenge resolution for template-specific scoring.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind, Supabase, vitest

## Global Constraints

- No new tables. Add `template_type TEXT` column to `challenges`.
- Template types: `beat_my_score`, `more_winners`, `use_my_picks`.
- Displayed on `/jogador/[nickname]` for authenticated users only, not on own profile.
- Pt-BR, dark theme, red accents, CSS variables.
- Reuse existing challenge creation + notification system.

---

### Task 1: Migration + types + API extension

**Files:**
- Create: `supabase/migrations/20260623000000_challenge_templates.sql`
- Modify: `src/types/index.ts` (add `ChallengeTemplateType`)
- Modify: `src/server/validators/challenges.ts`
- Modify: `src/server/services/app.ts` (extend `createUserChallenge`)
- Test: `tests/unit/challenge-templates.test.ts`

**Interfaces:**
- Produces: `challenges.template_type TEXT` column
- Produces: `ChallengeTemplateType` type
- Produces: `POST /api/challenges` accepts optional `template` field

- [ ] **Step 1: Create migration**

```sql
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS template_type TEXT;
```

- [ ] **Step 2: Add type**

```typescript
// src/types/index.ts
export type ChallengeTemplateType = "beat_my_score" | "more_winners" | "use_my_picks";
```

- [ ] **Step 3: Extend challenge validator**

In `src/server/validators/challenges.ts`, add optional `template` field to the challenge creation schema. Read existing validator to find the right place. Add:

```typescript
// In the challenge creation schema object:
template: z.enum(["beat_my_score", "more_winners", "use_my_picks"]).optional(),
```

- [ ] **Step 4: Extend createUserChallenge**

In `src/server/services/app.ts`, `createUserChallenge` currently accepts `(challengedId, eventId)`. Extend to accept optional `template`. Read the existing function. Change signature to:

```typescript
export async function createUserChallenge(
  challengedId: string,
  eventId: string,
  template?: ChallengeTemplateType,
)
```

Add `template_type: template || null` to the challenge creation insert.

- [ ] **Step 5: Extend challenge API route**

Read `src/server/api/challenges/route.ts` (or wherever the challenge POST is). Parse `template` from body and pass to `createUserChallenge`.

- [ ] **Step 6: Write tests**

```typescript
// tests/unit/challenge-templates.test.ts
describe("challenge templates", () => {
  it("creates challenge with template type beat_my_score", async () => {});
  it("creates manual challenge without template (null)", async () => {});
  it("rejects invalid template type", async () => {});
});
```

- [ ] **Step 7: Commit**

Run: `npx tsc --noEmit && npx vitest run`

```bash
git add supabase/migrations/20260623000000_challenge_templates.sql src/types/index.ts src/server/validators/challenges.ts src/server/services/app.ts tests/unit/challenge-templates.test.ts
git commit -m "feat(challenge): template_type column, API extension for challenge templates"
```

---

### Task 2: ChallengeTemplates component + profile integration

**Files:**
- Create: `src/components/profile/ChallengeTemplates.tsx`
- Modify: `src/components/jogador/PublicProfileClient.tsx`

**Interfaces:**
- Consumes: `POST /api/challenges` with template param
- Produces: rendered template buttons on /jogador/[nickname]

- [ ] **Step 1: Create ChallengeTemplates**

```typescript
// src/components/profile/ChallengeTemplates.tsx
"use client";

import { useState } from "react";
import { adminSend } from "@/components/admin/shared";
import toast from "react-hot-toast";
import type { ChallengeTemplateType } from "@/types";

const TEMPLATES: { type: ChallengeTemplateType; icon: string; label: string; desc: string }[] = [
  { type: "beat_my_score", icon: "🎯", label: "Bater minha pontuacao", desc: "Quem fizer mais pontos no evento vence" },
  { type: "more_winners", icon: "🥊", label: "Acerte mais vencedores", desc: "Quem acertar mais vencedores vence" },
  { type: "use_my_picks", icon: "📋", label: "Use meus picks como gabarito", desc: "Meus palpites viram o gabarito" },
];

export default function ChallengeTemplates({
  challengedId,
  challengedNickname,
  eventId,
}: {
  challengedId: string;
  challengedNickname: string;
  eventId: string;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function sendChallenge(template: ChallengeTemplateType) {
    setLoading(template);
    try {
      await adminSend("/api/challenges", {
        method: "POST",
        body: JSON.stringify({ challengedId, eventId, template }),
      });
      toast.success(`Desafio enviado para ${challengedNickname}!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-4">
      <p className="font-condensed text-xs uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
        Desafiar para...
      </p>
      <div className="grid gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.type}
            onClick={() => sendChallenge(t.type)}
            disabled={loading === t.type}
            className="flex items-start gap-3 p-3 text-left transition-all"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              opacity: loading === t.type ? 0.5 : 1,
            }}
          >
            <span className="text-lg mt-0.5">{t.icon}</span>
            <div>
              <div className="font-condensed font-700 text-sm uppercase" style={{ color: "var(--red)" }}>
                {loading === t.type ? "Enviando..." : t.label}
              </div>
              <div className="font-condensed text-xs" style={{ color: "var(--text-muted)" }}>
                {t.desc}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Integrate into PublicProfileClient**

Read `src/components/jogador/PublicProfileClient.tsx`. Add `ChallengeTemplates` below the FollowButton and bio sections. The component receives `challengedId` (from `profile.id`), `challengedNickname` (from `profile.nickname`), and `eventId` (needs the next upcoming event ID).

To get the next upcoming event, pass it from the page component. Extend `getPublicProfilePageData` in `app.ts` to include `nextEventId`:

```typescript
const { data: nextEvent } = await adminSupabase
  .from("events")
  .select("id")
  .eq("status", "upcoming")
  .order("event_date", { ascending: true })
  .limit(1)
  .maybeSingle();
```

Or simpler: have the client component fetch it on mount from `/api/events`.

Simplest: hardcode to the "next upcoming" event. The client component calls `GET /api/events?status=upcoming&limit=1` on mount and uses the first result.

```typescript
// In PublicProfileClient, fetch next event:
const [nextEventId, setNextEventId] = useState<string | null>(null);

useEffect(() => {
  fetch("/api/events?status=upcoming&limit=1")
    .then(r => r.json())
    .then(d => { if (d.data?.[0]) setNextEventId(d.data[0].id); })
    .catch(() => {});
}, []);
```

Then render (only for authenticated users, not own profile):
```typescript
{data.isViewerAuthenticated && !data.isOwnProfile && nextEventId && (
  <ChallengeTemplates
    challengedId={profile.id}
    challengedNickname={profile.nickname}
    eventId={nextEventId}
  />
)}
```

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit && npx vitest run`

```bash
git add src/components/profile/ChallengeTemplates.tsx src/components/jogador/PublicProfileClient.tsx
git commit -m "feat(challenge): ChallengeTemplates component on profile pages"
```

---

### Task 3: Template-specific scoring

**Files:**
- Modify: `src/server/services/app.ts` (extend `resolveChallengeLifecycle`)

**Interfaces:**
- Consumes: `template_type` from challenge record
- Produces: template-aware challenge resolution

- [ ] **Step 1: Extend challenge resolution**

Read `src/server/services/app.ts`, find `resolveChallengeLifecycle`. After the existing winner determination logic, add template-specific checks:

```typescript
// After existing logic that determines the winner:
if (challenge.template_type === "more_winners") {
  // Count correct winners for each participant
  const challengerWinners = await countCorrectWinners(adminSupabase, challenge.challenger_id, challenge.event_id);
  const challengedWinners = await countCorrectWinners(adminSupabase, challenge.challenged_id, challenge.event_id);
  if (challengerWinners > challengedWinners) {
    // challenger wins
  } else if (challengedWinners > challengerWinners) {
    // challenged wins
  } else {
    // draw
  }
} else if (challenge.template_type === "use_my_picks") {
  // Compare picks overlap
  const matchCount = await countMatchingPicks(adminSupabase, challenge.challenger_id, challenge.challenged_id, challenge.event_id);
  // The challenger's picks are the "gabarito." The challenged user gets 1 point per matching pick.
  // Winner determined by who has the higher match count.
} else {
  // beat_my_score or null — existing behavior (compare total_points)
}
```

Helper functions needed in app.ts:
```typescript
async function countCorrectWinners(client, userId, eventId): Promise<number> {
  const { data } = await client.from("picks")
    .select("points_winner")
    .eq("user_id", userId).eq("event_id", eventId).eq("is_confirmed", true);
  return (data || []).filter((p: any) => p.points_winner > 0).length;
}

async function countMatchingPicks(client, userIdA, userIdB, eventId): Promise<number> {
  const { data: picksA } = await client.from("picks")
    .select("fight_id, picked_winner_id")
    .eq("user_id", userIdA).eq("event_id", eventId).eq("is_confirmed", true);
  const { data: picksB } = await client.from("picks")
    .select("fight_id, picked_winner_id")
    .eq("user_id", userIdB).eq("event_id", eventId).eq("is_confirmed", true);
  const mapB = new Map((picksB || []).map((p: any) => [p.fight_id, p.picked_winner_id]));
  return (picksA || []).filter((p: any) => mapB.get(p.fight_id) === p.picked_winner_id).length;
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npx tsc --noEmit && npx vitest run`

```bash
git add src/server/services/app.ts
git commit -m "feat(challenge): template-specific scoring for more_winners and use_my_picks"
```

---

### Final Verification

- [ ] Run `npx tsc --noEmit`
- [ ] Run `npx vitest run`
- [ ] Run `npm run build`
